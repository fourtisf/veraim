import type { Agent, Call } from "@prisma/client";
import { AUTOPILOT_WALLET } from "./system";
import { prisma } from "@/lib/db";
import { MIN_GRADED_TO_RANK, gradingLabel, modelLabel } from "@/config/models";
import type { AgentView, CallStatus, CallView, SiteStats } from "@/lib/types";
import { ENV, explorerTx } from "./env";
import { modelAvailable } from "./llm";

const PALETTE: [string, string][] = [
  ["#8FA3FF", "#2B3A9E"], ["#7FE3B4", "#146B48"], ["#FF9AAE", "#8E2238"],
  ["#C9B2FF", "#4E2E9E"], ["#8FE3F0", "#0F6272"], ["#FFD08A", "#9A5A12"],
];
export function colorsFor(slug: string): [string, string] {
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

const DAY = 86400_000;

export function toCallView(c: Call & { agent: Pick<Agent, "slug" | "name"> & Partial<Pick<Agent, "official">> }): CallView {
  let priceChangePct: number | null = null;
  let symbol: string | null = null;
  try {
    if (c.outcomeJson) priceChangePct = JSON.parse(c.outcomeJson).priceChangePct ?? null;
    if (c.entryJson) symbol = JSON.parse(c.entryJson).symbol || null;
  } catch {}
  return {
    id: c.id,
    agent: { slug: c.agent.slug, name: c.agent.name, colors: colorsFor(c.agent.slug), official: !!c.agent.official },
    input: c.input,
    output: c.output,
    label: c.claimLabel,
    subject: c.subject,
    symbol,
    status: c.status as CallStatus,
    claimHash: c.claimHash,
    sealTx: c.sealTx,
    sealUrl: c.sealTx ? explorerTx(c.sealTx) : null,
    sealedAt: c.sealedAt?.toISOString() || null,
    gradesAt: c.gradesAt?.toISOString() || null,
    gradedAt: c.gradedAt?.toISOString() || null,
    gradeTx: c.gradeTx,
    priceChangePct,
    createdAt: c.createdAt.toISOString(),
  };
}

// Track record and activity for a set of agents, in a few grouped queries.
export async function agentViews(where: { hidden?: boolean; id?: string; slug?: string; creatorId?: string } = { hidden: false }): Promise<AgentView[]> {
  const agents = await prisma.agent.findMany({ where, include: { creator: true }, orderBy: { createdAt: "asc" } });
  if (!agents.length) return [];
  const ids = agents.map((a) => a.id);
  const [byStatus, runs7d, paid7d, bought, last, calls7d] = await Promise.all([
    prisma.call.groupBy({ by: ["agentId", "status"], where: { agentId: { in: ids } }, _count: true, _sum: { weight: true } }),
    prisma.run.groupBy({ by: ["agentId"], where: { agentId: { in: ids }, createdAt: { gte: new Date(Date.now() - 7 * DAY) }, user: { wallet: { not: AUTOPILOT_WALLET } } }, _count: true }),
    prisma.run.groupBy({ by: ["agentId"], where: { agentId: { in: ids }, paid: true, createdAt: { gte: new Date(Date.now() - 7 * DAY) } }, _count: true }),
    prisma.buyback.groupBy({ by: ["agentId"], where: { agentId: { in: ids } }, _sum: { amountUsd: true } }),
    prisma.$queryRaw<{ agentId: string; status: string }[]>`
      SELECT "agentId", status FROM (
        SELECT "agentId", status, ROW_NUMBER() OVER (PARTITION BY "agentId" ORDER BY "gradedAt" DESC) AS rn
        FROM "Call" WHERE status IN ('hit','miss') AND "agentId" = ANY(${ids})
      ) t WHERE rn <= 12`,
    prisma.call.groupBy({ by: ["agentId"], where: { agentId: { in: ids }, createdAt: { gte: new Date(Date.now() - 7 * DAY) } }, _count: true }),
  ]);

  return agents.map((a) => {
    const rows = byStatus.filter((r) => r.agentId === a.id);
    const get = (s: string) => rows.find((r) => r.status === s);
    const hits = get("hit")?._count || 0;
    const misses = get("miss")?._count || 0;
    const hitW = get("hit")?._sum.weight || 0;
    const missW = get("miss")?._sum.weight || 0;
    const graded = hits + misses;
    return {
      id: a.id,
      seq: a.seq,
      slug: a.slug,
      name: a.name,
      ticker: a.ticker,
      tagline: a.tagline,
      category: a.category,
      colors: colorsFor(a.slug),
      model: modelLabel(a.model),
      modelKey: a.model,
      modelReady: modelAvailable(a.model),
      tools: a.tools,
      gradingMode: a.gradingMode,
      gradingLabel: gradingLabel(a.gradingMode),
      price: a.pricePerRunUsd,
      official: a.official,
      creator: a.creator?.wallet || null,
      tokenAddress: a.tokenAddress,
      tokenSymbol: a.tokenSymbol,
      marketCapUsd: a.marketCapUsd,
      priceUsd: a.priceUsd,
      priceChange24h: a.priceChange24h,
      boughtBackUsd: Math.round((bought.find((b) => b.agentId === a.id)?._sum.amountUsd || 0) * 100) / 100,
      paidRuns7d: paid7d.find((r) => r.agentId === a.id)?._count || 0,
      createdAt: a.createdAt.toISOString(),
      ageDays: Math.max(0, Math.floor((Date.now() - a.createdAt.getTime()) / DAY)),
      trackRecord: hitW + missW > 0 ? Math.round((hitW / (hitW + missW)) * 1000) / 10 : null,
      graded,
      hits,
      misses,
      open: get("open")?._count || 0,
      ranked: graded >= MIN_GRADED_TO_RANK && a.gradingMode !== "none",
      runs7d: runs7d.find((r) => r.agentId === a.id)?._count || 0,
      calls7d: calls7d.find((r) => r.agentId === a.id)?._count || 0,
      callsTotal: rows.reduce((s, r) => s + r._count, 0),
      last12: last.filter((l) => l.agentId === a.id).map((l) => l.status as "hit" | "miss").reverse(),
    };
  });
}

// Ranked agents first (by record), then unranked by graded calls, then newest.
export function rankAgents(list: AgentView[]) {
  return [...list].sort((x, y) => {
    if (x.ranked !== y.ranked) return x.ranked ? -1 : 1;
    if (x.ranked) return (y.trackRecord || 0) - (x.trackRecord || 0);
    if (y.graded !== x.graded) return y.graded - x.graded;
    return y.callsTotal - x.callsTotal;
  });
}

export async function recentCalls(opts: { take?: number; agentId?: string; status?: "open" | "graded"; before?: Date } = {}) {
  const calls = await prisma.call.findMany({
    where: {
      agent: { hidden: false },
      ...(opts.agentId && { agentId: opts.agentId }),
      ...(opts.status === "open" && { status: "open" }),
      ...(opts.status === "graded" && { status: { in: ["hit", "miss"] } }),
      ...(!opts.status && !opts.agentId && { claimHash: { not: null } }),
    },
    include: { agent: { select: { slug: true, name: true, official: true } } },
    orderBy: { createdAt: "desc" },
    take: opts.take || 40,
  });
  return calls.map(toCallView);
}

export async function siteStats(agents: AgentView[]): Promise<SiteStats> {
  const now = Date.now();
  const startOfDay = new Date(new Date().setUTCHours(0, 0, 0, 0));
  const [sealedCalls, sealedToday, sealedYesterday, pending, graded24, calls24h, waitlistCount, bought] = await Promise.all([
    prisma.call.count({ where: { sealTx: { not: null } } }),
    prisma.call.count({ where: { sealedAt: { gte: startOfDay } } }),
    prisma.call.count({ where: { sealedAt: { gte: new Date(startOfDay.getTime() - DAY), lt: startOfDay } } }),
    prisma.call.count({ where: { status: "open" } }),
    prisma.call.groupBy({ by: ["status"], where: { status: { in: ["hit", "miss"] }, gradedAt: { gte: new Date(now - DAY) } }, _count: true }),
    prisma.call.count({ where: { createdAt: { gte: new Date(now - DAY) } } }),
    prisma.waitlist.count(),
    prisma.buyback.aggregate({ _sum: { amountUsd: true } }),
  ]);
  const top = agents.filter((a) => a.ranked).sort((x, y) => (y.trackRecord || 0) - (x.trackRecord || 0)).slice(0, 100);
  const h = graded24.find((g) => g.status === "hit")?._count || 0;
  const m = graded24.find((g) => g.status === "miss")?._count || 0;
  return {
    agentCount: agents.length,
    sealedCalls,
    avgTopRecord: top.length ? Math.round((top.reduce((s, a) => s + (a.trackRecord || 0), 0) / top.length) * 10) / 10 : null,
    boughtBackUsd: Math.round(bought._sum.amountUsd || 0),
    typicalPrice: 0.05,
    sealedToday,
    sealedYesterday,
    hitRate24h: h + m ? Math.round((h / (h + m)) * 100) : null,
    pending,
    calls24h,
    waitlistCount,
  };
}

// Daily track record over the last 30 days (null before the first graded call).
export async function recordSeries(agentId: string, days = 30): Promise<(number | null)[]> {
  const graded = await prisma.call.findMany({ where: { agentId, status: { in: ["hit", "miss"] } }, select: { status: true, weight: true, gradedAt: true }, orderBy: { gradedAt: "asc" } });
  const out: (number | null)[] = [];
  const end = new Date(new Date().setUTCHours(23, 59, 59, 999)).getTime();
  let i = 0, hitW = 0, allW = 0;
  for (let d = days - 1; d >= 0; d--) {
    const dayEnd = end - d * DAY;
    while (i < graded.length && graded[i].gradedAt!.getTime() <= dayEnd) {
      allW += graded[i].weight;
      if (graded[i].status === "hit") hitW += graded[i].weight;
      i++;
    }
    out.push(allW ? Math.round((hitW / allW) * 1000) / 10 : null);
  }
  return out;
}

export const siteInfo = () => ({ explorerUrl: ENV.explorerUrl });

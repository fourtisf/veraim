// Autopilot: each official agent analyses the biggest live tokens on its own, spread evenly over
// the day (AUTOPILOT_RUNS_PER_AGENT_PER_DAY), so track records fill up without waiting for users.
// Its calls are sealed and graded exactly like a user's.
import { prisma } from "@/lib/db";
import { ENV } from "./env";
import { modelAvailable } from "./llm";
import { runAgent } from "./runner";
import { AUTOPILOT_WALLET } from "./system";
import { questionFor, topTokens } from "./topTokens";

const DAY = 86_400_000;

export async function autopilotTick(log: (...a: unknown[]) => void = console.log) {
  const perDay = ENV.autopilotPerAgentPerDay;
  if (perDay <= 0) return;
  const agents = (await prisma.agent.findMany({ where: { official: true, hidden: false }, orderBy: { seq: "asc" } })).filter((a) => modelAvailable(a.model));
  if (!agents.length) return;
  const tokens = await topTokens(30);
  if (!tokens.length) {
    log("autopilot: no tokens with enough liquidity found (set AUTOPILOT_TOKENS to pick them by hand)");
    return;
  }
  const user = await prisma.user.upsert({ where: { wallet: AUTOPILOT_WALLET }, update: {}, create: { wallet: AUTOPILOT_WALLET } });

  for (const agent of agents) {
    const week = await prisma.run.findMany({
      where: { userId: user.id, agentId: agent.id, createdAt: { gte: new Date(Date.now() - 7 * DAY) } },
      include: { call: { select: { input: true } } },
      orderBy: { createdAt: "desc" },
    });
    const today = week.filter((r) => Date.now() - r.createdAt.getTime() < DAY);
    if (today.length >= perDay) continue;
    if (week[0] && Date.now() - week[0].createdAt.getTime() < DAY / perDay) continue; // spread over the day

    // Biggest token this agent hasn't looked at for the longest time.
    const lastAsked = (addr: string) => {
      const r = week.find((x) => x.call?.input.toLowerCase().includes(addr.toLowerCase()));
      return r ? r.createdAt.getTime() : 0;
    };
    const token = [...tokens].sort((a, b) => lastAsked(a.address) - lastAsked(b.address))[0];
    try {
      const { call } = await runAgent(agent, user, questionFor(agent, token));
      log(`autopilot: ${agent.name} on $${token.symbol} → ${call.label || call.status}`);
    } catch (err) {
      log(`autopilot: ${agent.name} on $${token.symbol} failed:`, (err as Error).message);
    }
  }
}

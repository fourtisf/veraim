import { prisma } from "@/lib/db";
import type { HomeData } from "@/components/HomeData";
import { agentViews, rankAgents, recentCalls, siteStats, toCallView } from "./views";

export async function homeData(): Promise<HomeData> {
  const agents = rankAgents(await agentViews());
  const [calls, stats, next, lastGraded] = await Promise.all([
    recentCalls({ take: 40 }),
    siteStats(agents),
    prisma.call.findFirst({ where: { status: "open" }, orderBy: { gradesAt: "asc" }, select: { gradesAt: true } }),
    prisma.call.findFirst({ where: { status: { in: ["hit", "miss"] }, agent: { hidden: false } }, orderBy: { gradedAt: "desc" }, include: { agent: { select: { slug: true, name: true } } } }),
  ]);
  return { agents, calls, stats, nextGradeAt: next?.gradesAt?.toISOString() || null, lastGraded: lastGraded ? toCallView(lastGraded) : null };
}

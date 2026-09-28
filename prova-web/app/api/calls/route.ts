import { json } from "@/lib/server/http";
import { agentViews, recentCalls, siteStats } from "@/lib/server/views";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Live feed: latest sealed calls plus the KPIs next to it.
export async function GET(req: Request) {
  const f = new URL(req.url).searchParams.get("filter");
  const status = f === "open" || f === "graded" ? f : undefined;
  const [calls, agents, next] = await Promise.all([
    recentCalls({ take: 40, status }),
    agentViews(),
    prisma.call.findFirst({ where: { status: "open" }, orderBy: { gradesAt: "asc" }, select: { gradesAt: true } }),
  ]);
  return json({ calls, stats: await siteStats(agents), nextGradeAt: next?.gradesAt?.toISOString() || null });
}

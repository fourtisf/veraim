import { prisma } from "@/lib/db";
import { FREE_RUNS_PER_AGENT } from "@/config/models";
import { fail, json } from "@/lib/server/http";
import { currentUser } from "@/lib/server/session";
import { paidRunsLeft } from "@/lib/server/payments";
import { paymentsEnabled, sealingEnabled } from "@/lib/server/chain";
import { agentViews, recentCalls, recordSeries } from "@/lib/server/views";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const [agent] = await agentViews({ slug: params.slug, hidden: false });
  if (!agent) return fail("Agent not found.", 404);
  const user = await currentUser();
  const [calls, series, used] = await Promise.all([
    recentCalls({ agentId: agent.id, take: 30 }),
    recordSeries(agent.id),
    user ? prisma.run.count({ where: { agentId: agent.id, userId: user.id, paid: false } }) : 0,
  ]);
  const paidLeft = user ? await paidRunsLeft(user.id, agent.id) : null;
  return json({ agent, calls, series, freeRunsLeft: user ? Math.max(0, FREE_RUNS_PER_AGENT - used) : null, paidRunsLeft: paidLeft, paymentsEnabled: paymentsEnabled(), sealingEnabled: sealingEnabled() });
}

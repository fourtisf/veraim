import { prisma } from "@/lib/db";
import { fail, json } from "@/lib/server/http";
import { recentCalls } from "@/lib/server/views";

export const dynamic = "force-dynamic";

// Public: an agent's latest calls with their seals and grades.
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const agent = await prisma.agent.findUnique({ where: { slug: params.slug } });
  if (!agent || agent.hidden) return fail("Agent not found.", 404);
  const calls = await recentCalls({ agentId: agent.id, take: 50 });
  return json({
    calls: calls.map((c) => ({
      id: c.id, verdict: c.label, token: c.subject, status: c.status, seal: c.claimHash, seal_tx: c.sealTx,
      sealed_at: c.sealedAt, grades_at: c.gradesAt, graded_at: c.gradedAt, grade_tx: c.gradeTx, made_at: c.createdAt,
    })),
  });
}

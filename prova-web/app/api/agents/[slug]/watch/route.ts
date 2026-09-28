import { prisma } from "@/lib/db";
import { fail, json } from "@/lib/server/http";
import { currentUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

// Toggles the agent on the signed-in wallet's watchlist.
export async function POST(_req: Request, { params }: { params: { slug: string } }) {
  const user = await currentUser();
  if (!user) return fail("Connect your wallet to use a watchlist.", 401);
  const agent = await prisma.agent.findUnique({ where: { slug: params.slug } });
  if (!agent) return fail("Agent not found.", 404);
  const key = { userId_agentId: { userId: user.id, agentId: agent.id } };
  const existing = await prisma.watch.findUnique({ where: key });
  if (existing) await prisma.watch.delete({ where: key });
  else await prisma.watch.create({ data: { userId: user.id, agentId: agent.id } });
  return json({ on: !existing });
}

import { prisma } from "@/lib/db";
import { fail, json, readJson } from "@/lib/server/http";
import { currentUser, isAdmin } from "@/lib/server/session";

export const dynamic = "force-dynamic";

// Hide or show an agent (admins only).
export async function POST(req: Request) {
  const user = await currentUser();
  if (!isAdmin(user?.wallet)) return fail("Admins only.", 403);
  const { id, hidden } = await readJson(req);
  if (typeof id !== "string" || typeof hidden !== "boolean") return fail("Bad request.");
  await prisma.agent.update({ where: { id }, data: { hidden } });
  return json({ ok: true });
}

import { prisma } from "@/lib/db";
import { newApiKey } from "@/lib/server/apiKeys";
import { fail, json } from "@/lib/server/http";
import { currentUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return fail("Connect your wallet first.", 401);
  const keys = await prisma.apiKey.findMany({ where: { userId: user.id, revokedAt: null }, orderBy: { createdAt: "desc" } });
  return json({ keys: keys.map((k) => ({ id: k.id, prefix: k.prefix, createdAt: k.createdAt, lastUsedAt: k.lastUsedAt })) });
}

// Creates a key. The full key is returned once and never stored.
export async function POST() {
  const user = await currentUser();
  if (!user) return fail("Connect your wallet first.", 401);
  if ((await prisma.apiKey.count({ where: { userId: user.id, revokedAt: null } })) >= 5) return fail("You can have up to 5 active keys.");
  const k = newApiKey();
  await prisma.apiKey.create({ data: { userId: user.id, prefix: k.prefix, hash: k.hash } });
  return json({ key: k.key }, 201);
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return fail("Connect your wallet first.", 401);
  const id = new URL(req.url).searchParams.get("id") || "";
  await prisma.apiKey.updateMany({ where: { id, userId: user.id }, data: { revokedAt: new Date() } });
  return json({ ok: true });
}

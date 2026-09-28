import { prisma } from "@/lib/db";
import { fail, json, readJson } from "@/lib/server/http";
import { currentUser } from "@/lib/server/session";
import { checkWebhookUrl, newWebhookSecret } from "@/lib/server/webhooks";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return fail("Connect your wallet first.", 401);
  const hooks = await prisma.webhook.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return json({ webhooks: hooks.map((h) => ({ id: h.id, url: h.url, disabled: h.disabled, failures: h.failures, lastError: h.lastError, lastOkAt: h.lastOkAt })) });
}

// Adds a webhook. The signing secret is returned once.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return fail("Connect your wallet first.", 401);
  const { url } = await readJson(req);
  if (typeof url !== "string" || url.length > 500) return fail("Enter a webhook URL.");
  const problem = await checkWebhookUrl(url);
  if (problem) return fail(problem);
  if ((await prisma.webhook.count({ where: { userId: user.id } })) >= 3) return fail("You can have up to 3 webhooks.");
  const secret = newWebhookSecret();
  await prisma.webhook.create({ data: { userId: user.id, url, secret } });
  return json({ secret }, 201);
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return fail("Connect your wallet first.", 401);
  await prisma.webhook.deleteMany({ where: { id: new URL(req.url).searchParams.get("id") || "", userId: user.id } });
  return json({ ok: true });
}

import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { ENV } from "@/lib/server/env";
import { fail, json } from "@/lib/server/http";
import { currentUser } from "@/lib/server/session";
import { telegramEnabled } from "@/lib/server/telegram";

export const dynamic = "force-dynamic";

// Toggles Telegram alerts for this agent. If the wallet hasn't linked Telegram yet,
// also returns a one-time link to the bot.
export async function POST(_req: Request, { params }: { params: { slug: string } }) {
  if (!telegramEnabled()) return fail("Telegram alerts aren't switched on yet.", 503);
  const user = await currentUser();
  if (!user) return fail("Connect your wallet to set alerts.", 401);
  const agent = await prisma.agent.findUnique({ where: { slug: params.slug } });
  if (!agent) return fail("Agent not found.", 404);
  const key = { userId_agentId: { userId: user.id, agentId: agent.id } };
  const existing = await prisma.alert.findUnique({ where: key });
  if (existing) {
    await prisma.alert.delete({ where: key });
    return json({ on: false });
  }
  await prisma.alert.create({ data: { userId: user.id, agentId: agent.id } });
  let linkUrl: string | null = null;
  if (!user.telegramChatId) {
    const code = randomBytes(9).toString("base64url");
    await prisma.user.update({ where: { id: user.id }, data: { telegramLinkCode: code } });
    linkUrl = `https://t.me/${ENV.telegramBot}?start=${code}`;
  }
  return json({ on: true, linkUrl });
}

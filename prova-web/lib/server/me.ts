import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { Me } from "@/lib/types";
import { isAdmin } from "./session";
import { telegramEnabled } from "./telegram";

export async function meView(user: User | null): Promise<Me> {
  if (!user) return null;
  const [watch, alerts] = await Promise.all([
    prisma.watch.findMany({ where: { userId: user.id }, select: { agent: { select: { slug: true } } } }),
    prisma.alert.findMany({ where: { userId: user.id }, select: { agent: { select: { slug: true } } } }),
  ]);
  return {
    wallet: user.wallet,
    admin: isAdmin(user.wallet),
    watch: watch.map((w) => w.agent.slug),
    alerts: alerts.map((a) => a.agent.slug),
    telegramLinked: !!user.telegramChatId,
    telegramReady: telegramEnabled(),
  };
}

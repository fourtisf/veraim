import { prisma } from "@/lib/db";
import { ENV } from "@/lib/server/env";
import { fail, json, readJson } from "@/lib/server/http";
import { clientIp } from "@/lib/server/ip";
import { sendMail } from "@/lib/server/mail";
import { rateLimited } from "@/lib/rateLimit";
import { normalizeEntry, WAITLIST_SOURCES, type WaitlistSource } from "@/lib/waitlist";

export const dynamic = "force-dynamic";

export async function GET() {
  return json({ count: await prisma.waitlist.count() });
}

export async function POST(req: Request) {
  if (rateLimited(clientIp(req))) return fail("Too many requests. Please try again in a few minutes.", 429);

  const body = await readJson(req);
  // Honeypot: a hidden field real people never fill in.
  if (body.website) return json({ ok: true });
  const value = normalizeEntry(body.value);
  if (!value) return fail("Enter a valid email or wallet address (0x…).");
  const source: WaitlistSource | null = WAITLIST_SOURCES.includes(body.source) ? body.source : null;

  try {
    const existing = await prisma.waitlist.findUnique({ where: { emailOrWallet: value } });
    if (!existing) {
      await prisma.waitlist.create({ data: { emailOrWallet: value, source } });
      if (value.includes("@")) {
        sendMail(
          value,
          "You're on the Prova list",
          `Thanks for joining Prova, the AI agent marketplace ranked by verified track record.\n\nWe'll email you when new features and the Prova token go live.\n\n${ENV.siteUrl}\n\nDidn't sign up? Ignore this email.`
        ).catch((err) => console.error("waitlist email failed", err));
      }
    }
  } catch (err) {
    console.error("waitlist insert failed", err);
    return fail("Something went wrong. Please try again.", 500);
  }
  return json({ ok: true, count: await prisma.waitlist.count() });
}

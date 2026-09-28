import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimited } from "@/lib/rateLimit";
import { normalizeEntry, WAITLIST_SOURCES, type WaitlistSource } from "@/lib/waitlist";

export const dynamic = "force-dynamic";

// Nginx passes the visitor's IP in X-Real-IP / X-Forwarded-For (see deploy/nginx.conf).
function clientIp(req: Request) {
  return req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

export async function POST(req: Request) {
  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ error: "Too many requests. Please try again in a few minutes." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const value = normalizeEntry(body?.value);
  if (!value) {
    return NextResponse.json({ error: "Enter a valid email or wallet address (0x…)." }, { status: 400 });
  }
  const source: WaitlistSource | null = WAITLIST_SOURCES.includes(body?.source) ? body.source : null;

  try {
    // Joining twice is fine: the existing entry is kept and we still say "you're on the list".
    await prisma.waitlist.upsert({
      where: { emailOrWallet: value },
      update: {},
      create: { emailOrWallet: value, source },
    });
  } catch (err) {
    console.error("waitlist insert failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

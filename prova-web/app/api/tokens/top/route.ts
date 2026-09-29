import { NextResponse } from "next/server";
import { topTokens } from "@/lib/server/topTokens";

export const dynamic = "force-dynamic";

// The biggest live tokens on the chain by market cap (cached for 15 minutes).
export async function GET(req: Request) {
  const limit = Math.min(20, Math.max(1, Number(new URL(req.url).searchParams.get("limit")) || 8));
  const tokens = await topTokens(limit).catch(() => []);
  return NextResponse.json({ tokens }, { headers: { "cache-control": "public, max-age=300" } });
}

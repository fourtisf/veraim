import { NextResponse } from "next/server";
import { topTokens } from "@/lib/server/topTokens";

export const dynamic = "force-dynamic";

// The biggest live tokens on the chain by market cap (cached for 15 minutes).
export async function GET() {
  const tokens = await topTokens(8).catch(() => []);
  return NextResponse.json({ tokens }, { headers: { "cache-control": "public, max-age=300" } });
}

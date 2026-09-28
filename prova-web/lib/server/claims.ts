import { encodeAbiParameters, keccak256 } from "viem";
import type { AgentOutput } from "./llm";
import type { Market } from "./tools/dexscreener";

const HOUR = 3600_000;
export const GRADE_AFTER: Record<string, number> = { verdict24h: 24 * HOUR, price7d: 7 * 24 * HOUR };

export type Entry = { priceUsd: number; liquidityUsd: number; pairAddress: string; symbol: string };

export type Claim = {
  claimJson: string;
  label: string;
  subject: string;
  hash: `0x${string}`;
  gradesAt: Date;
  entry: Entry;
  weight: number;
};

// keccak256(agentSeq, claimJson, unix seconds) — the value written onchain.
export function claimHash(agentSeq: number, claimJson: string, at: Date): `0x${string}` {
  return keccak256(
    encodeAbiParameters([{ type: "uint256" }, { type: "string" }, { type: "uint64" }], [BigInt(agentSeq), claimJson, BigInt(Math.floor(at.getTime() / 1000))])
  );
}

// Turns the model's output into a sealable claim, or null if it isn't gradable
// (agent not graded, no token, no verdict/direction, or the token has no market price).
export function buildClaim(opts: {
  agentSeq: number;
  gradingMode: string;
  output: AgentOutput;
  token: string | null;
  market: Market | null;
  minLiquidityUsd: number;
  now: Date;
}): Claim | null {
  const { agentSeq, gradingMode, output, market, now } = opts;
  const after = GRADE_AFTER[gradingMode];
  if (!after) return null;
  const c = output.claim;
  const token = (/^0x[a-fA-F0-9]{40}$/.test(c.token) ? c.token : opts.token || "").toLowerCase();
  if (!token || !market || !(market.priceUsd > 0)) return null;
  if (opts.token && token !== opts.token) return null; // must be about the token that was checked

  let call: Record<string, string>;
  let label: string;
  if (gradingMode === "verdict24h") {
    if (c.kind !== "verdict" || c.verdict === "NONE") return null;
    call = { verdict: c.verdict };
    label = (c.label || c.verdict).slice(0, 40).toUpperCase();
  } else {
    if (c.kind !== "direction" || c.direction === "NONE") return null;
    call = { direction: c.direction };
    label = `${c.direction} · 7d`;
  }

  const gradesAt = new Date(now.getTime() + after);
  const entry: Entry = { priceUsd: market.priceUsd, liquidityUsd: market.liquidityUsd, pairAddress: market.pairAddress, symbol: market.symbol };
  // Fixed key order so the JSON (and its hash) can be reproduced by anyone.
  const claimJson = JSON.stringify({
    v: 1,
    agent: agentSeq,
    token,
    mode: gradingMode,
    ...call,
    label,
    entryPriceUsd: entry.priceUsd,
    entryLiquidityUsd: Math.round(entry.liquidityUsd),
    madeAt: now.toISOString(),
    gradesAt: gradesAt.toISOString(),
  });
  return {
    claimJson,
    label,
    subject: token,
    hash: claimHash(agentSeq, claimJson, now),
    gradesAt,
    entry,
    weight: entry.liquidityUsd < opts.minLiquidityUsd ? 0.5 : 1,
  };
}

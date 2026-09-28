import assert from "node:assert/strict";
import { test } from "node:test";
import { buildClaim, claimHash } from "../lib/server/claims";

const token = "0x1111111111111111111111111111111111111111";
const market = { priceUsd: 2, liquidityUsd: 50_000, volume24hUsd: 0, fdvUsd: null, marketCapUsd: null, priceChange24h: null, pairAddress: "0xpool", dex: "uni", pairCreatedAt: null, symbol: "T", name: "T" };
const now = new Date("2026-09-28T12:00:00Z");
const out = (claim: object) => ({ answer: "x", claim: { kind: "verdict", token, label: "bundled", verdict: "RISKY", direction: "NONE", ...claim } }) as any;
const base = { agentSeq: 7, gradingMode: "verdict24h", token, market, minLiquidityUsd: 10_000, now };

test("verdict claim is hashed and due in 24h", () => {
  const c = buildClaim({ ...base, output: out({}) })!;
  assert.equal(c.label, "BUNDLED");
  assert.equal(c.gradesAt.toISOString(), "2026-09-29T12:00:00.000Z");
  assert.equal(c.hash, claimHash(7, c.claimJson, now));
  assert.equal(JSON.parse(c.claimJson).verdict, "RISKY");
  assert.equal(c.weight, 1);
});

test("thin liquidity counts half", () => {
  assert.equal(buildClaim({ ...base, market: { ...market, liquidityUsd: 5_000 }, output: out({}) })!.weight, 0.5);
});

test("no claim without a market, a verdict, or for another token", () => {
  assert.equal(buildClaim({ ...base, market: null, output: out({}) }), null);
  assert.equal(buildClaim({ ...base, output: out({ kind: "none", verdict: "NONE" }) }), null);
  assert.equal(buildClaim({ ...base, output: out({ token: "0x2222222222222222222222222222222222222222" }) }), null);
  assert.equal(buildClaim({ ...base, gradingMode: "none", output: out({}) }), null);
});

test("price mode needs a direction and is due in 7 days", () => {
  const c = buildClaim({ ...base, gradingMode: "price7d", output: out({ kind: "direction", direction: "SHORT", verdict: "NONE" }) })!;
  assert.equal(c.label, "SHORT · 7d");
  assert.equal(c.gradesAt.toISOString(), "2026-10-05T12:00:00.000Z");
  assert.equal(buildClaim({ ...base, gradingMode: "price7d", output: out({}) }), null);
});

test("hash changes if anything in the claim changes", () => {
  const a = claimHash(1, '{"a":1}', now), b = claimHash(1, '{"a":2}', now), c = claimHash(2, '{"a":1}', now);
  assert.notEqual(a, b);
  assert.notEqual(a, c);
});

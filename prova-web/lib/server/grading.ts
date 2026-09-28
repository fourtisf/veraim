// Grading rules. Pure functions so they are easy to test and to publish.
//
// Price call (LONG / SHORT, 7 days): LONG is a hit if the price is higher at the
// deadline than when the call was made; SHORT is a hit if it is lower. If the token
// has no market left, the price counts as zero.
//
// Verdict (24 hours): a token "collapsed" if its price fell by at least 50% or its
// liquidity fell by at least 50% (or its market disappeared). CAUTION uses a 30% bar.
//   RISKY   -> hit if it collapsed
//   CAUTION -> hit if it fell 30% or more (price or liquidity)
//   SAFE    -> hit if it did not collapse
export type Outcome = { priceUsd: number; liquidityUsd: number; priceChangePct: number; liquidityChangePct: number; marketGone: boolean };

export function measure(entry: { priceUsd: number; liquidityUsd: number }, exit: { priceUsd: number; liquidityUsd: number } | null): Outcome {
  const priceUsd = exit?.priceUsd || 0;
  const liquidityUsd = exit?.liquidityUsd || 0;
  const ch = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 1000) / 10 : 0);
  return { priceUsd, liquidityUsd, priceChangePct: ch(priceUsd, entry.priceUsd), liquidityChangePct: ch(liquidityUsd, entry.liquidityUsd), marketGone: !exit };
}

export function grade(claim: { verdict?: string; direction?: string }, o: Outcome): "hit" | "miss" {
  const fell = (bar: number) => o.marketGone || o.priceChangePct <= -bar || o.liquidityChangePct <= -bar;
  if (claim.direction === "LONG") return o.priceChangePct > 0 && !o.marketGone ? "hit" : "miss";
  if (claim.direction === "SHORT") return o.priceChangePct < 0 || o.marketGone ? "hit" : "miss";
  if (claim.verdict === "RISKY") return fell(50) ? "hit" : "miss";
  if (claim.verdict === "CAUTION") return fell(30) ? "hit" : "miss";
  if (claim.verdict === "SAFE") return fell(50) ? "miss" : "hit";
  throw new Error("claim has no verdict or direction");
}

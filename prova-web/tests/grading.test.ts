import assert from "node:assert/strict";
import { test } from "node:test";
import { grade, measure } from "../lib/server/grading";

const entry = { priceUsd: 1, liquidityUsd: 100_000 };
const at = (price: number, liq = 100_000) => measure(entry, { priceUsd: price, liquidityUsd: liq });
const gone = measure(entry, null);

test("LONG hits only when price is higher", () => {
  assert.equal(grade({ direction: "LONG" }, at(1.2)), "hit");
  assert.equal(grade({ direction: "LONG" }, at(1)), "miss");
  assert.equal(grade({ direction: "LONG" }, at(0.8)), "miss");
  assert.equal(grade({ direction: "LONG" }, gone), "miss");
});

test("SHORT hits when price is lower or the market is gone", () => {
  assert.equal(grade({ direction: "SHORT" }, at(0.9)), "hit");
  assert.equal(grade({ direction: "SHORT" }, at(1.1)), "miss");
  assert.equal(grade({ direction: "SHORT" }, gone), "hit");
});

test("RISKY hits on a 50% price or liquidity collapse", () => {
  assert.equal(grade({ verdict: "RISKY" }, at(0.5)), "hit");
  assert.equal(grade({ verdict: "RISKY" }, at(1, 40_000)), "hit");
  assert.equal(grade({ verdict: "RISKY" }, gone), "hit");
  assert.equal(grade({ verdict: "RISKY" }, at(0.6)), "miss");
});

test("CAUTION uses a 30% bar", () => {
  assert.equal(grade({ verdict: "CAUTION" }, at(0.7)), "hit");
  assert.equal(grade({ verdict: "CAUTION" }, at(0.75)), "miss");
});

test("SAFE hits unless it collapsed", () => {
  assert.equal(grade({ verdict: "SAFE" }, at(0.6)), "hit");
  assert.equal(grade({ verdict: "SAFE" }, at(0.5)), "miss");
  assert.equal(grade({ verdict: "SAFE" }, gone), "miss");
});

test("measure reports percentage changes", () => {
  assert.deepEqual(at(0.3, 20_000), { priceUsd: 0.3, liquidityUsd: 20_000, priceChangePct: -70, liquidityChangePct: -80, marketGone: false });
});

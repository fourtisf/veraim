import { ENV } from "./env";
import { getJson } from "./tools/http";

// ETH price in USD, used to quote paid runs and value buybacks. CoinGecko first, DexScreener as backup.
export async function ethUsd(): Promise<number> {
  if (ENV.ethUsdOverride) return ENV.ethUsdOverride;
  try {
    const d = await getJson<{ ethereum?: { usd?: number } }>("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd", { ttlMs: 60_000 });
    if (d.ethereum?.usd) return d.ethereum.usd;
  } catch {}
  const d = await getJson<{ pairs?: any[] }>(`${ENV.dexscreenerBase}/latest/dex/search?q=WETH%20USDC`, { ttlMs: 60_000 });
  const p = (d.pairs || []).filter((x) => x.baseToken?.symbol === "WETH" && +x.priceUsd > 0).sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
  if (!p) throw new Error("ETH price unavailable");
  return +p.priceUsd;
}

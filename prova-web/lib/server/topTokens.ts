// The biggest live tokens on the chain, by market cap: shown as one-click picks next to the
// ask box and used by the autopilot. Candidates come from the explorer's token list plus
// AUTOPILOT_TOKENS; DexScreener supplies price, liquidity and market cap.
import { ENV } from "./env";
import { getJson } from "./tools/http";
export { questionFor } from "../tokenQuestion";

export type TopToken = { address: string; symbol: string; name: string; marketCapUsd: number; liquidityUsd: number; priceChange24h: number | null };

// Stablecoins and wrapped ETH aren't worth asking an agent about.
const SKIP_SYMBOLS = new Set(["USDG", "USDC", "USDT", "DAI", "WETH", "ETH", "USDC.E", "PYUSD", "USDE"]);
const TTL = 15 * 60_000;
let cached: { at: number; list: TopToken[] } | null = null;

const isAddr = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s);

async function candidates(): Promise<string[]> {
  const out = new Set(ENV.autopilotTokens.map((a) => a.toLowerCase()));
  try {
    let url = `${ENV.blockscoutApi}/tokens?type=ERC-20`;
    for (let page = 0; page < 2; page++) {
      const d = await getJson<{ items?: any[]; next_page_params?: Record<string, string> | null }>(url, { ttlMs: TTL });
      for (const t of d.items || []) {
        const a = String(t.address_hash || t.address || "");
        if (isAddr(a) && !SKIP_SYMBOLS.has(String(t.symbol || "").toUpperCase())) out.add(a.toLowerCase());
      }
      if (!d.next_page_params) break;
      url = `${ENV.blockscoutApi}/tokens?type=ERC-20&${new URLSearchParams(d.next_page_params)}`;
    }
  } catch (err) {
    console.error("top tokens: explorer list failed:", (err as Error).message);
  }
  for (const a of [ENV.usdg, ENV.weth]) if (a) out.delete(a.toLowerCase());
  return [...out];
}

export async function topTokens(limit = 12): Promise<TopToken[]> {
  if (cached && Date.now() - cached.at < TTL) return cached.list.slice(0, limit);
  const addrs = await candidates();
  const best = new Map<string, TopToken>();
  for (let i = 0; i < addrs.length; i += 30) {
    const chunk = addrs.slice(i, i + 30);
    try {
      const d = await getJson<{ pairs?: any[] }>(`${ENV.dexscreenerBase}/latest/dex/tokens/${chunk.join(",")}`, { ttlMs: TTL });
      for (const p of d.pairs || []) {
        const a = String(p.baseToken?.address || "").toLowerCase();
        if (p.chainId !== ENV.dexscreenerChain || !chunk.includes(a)) continue;
        if (SKIP_SYMBOLS.has(String(p.baseToken?.symbol || "").toUpperCase())) continue;
        const liq = p.liquidity?.usd || 0;
        const prev = best.get(a);
        if (prev && prev.liquidityUsd >= liq) continue;
        best.set(a, {
          address: p.baseToken.address,
          symbol: p.baseToken.symbol || "",
          name: p.baseToken.name || "",
          marketCapUsd: p.marketCap || p.fdv || 0,
          liquidityUsd: liq,
          priceChange24h: p.priceChange?.h24 ?? null,
        });
      }
    } catch (err) {
      console.error("top tokens: market data failed:", (err as Error).message);
    }
  }
  const list = [...best.values()]
    .filter((t) => t.liquidityUsd >= ENV.minLiquidityUsd && t.marketCapUsd > 0)
    .sort((a, b) => b.marketCapUsd - a.marketCapUsd)
    .slice(0, 30);
  if (list.length) cached = { at: Date.now(), list };
  return list.slice(0, limit);
}

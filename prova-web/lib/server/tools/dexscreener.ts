import { ENV } from "../env";
import { getJson } from "./http";

export type Market = {
  priceUsd: number;
  liquidityUsd: number;
  volume24hUsd: number;
  fdvUsd: number | null;
  priceChange24h: number | null;
  pairAddress: string;
  dex: string;
  pairCreatedAt: string | null;
  symbol: string;
  name: string;
};

// Best (most liquid) pool for a token on the configured chain, or null if it has none.
export async function tokenMarket(token: string, ttlMs = 30_000): Promise<Market | null> {
  const data = await getJson<{ pairs?: any[] }>(`${ENV.dexscreenerBase}/latest/dex/tokens/${token}`, { ttlMs });
  const pairs = (data.pairs || []).filter((p) => p.chainId === ENV.dexscreenerChain && p.baseToken?.address?.toLowerCase() === token.toLowerCase());
  if (!pairs.length) return null;
  const p = pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
  return {
    priceUsd: +p.priceUsd || 0,
    liquidityUsd: p.liquidity?.usd || 0,
    volume24hUsd: p.volume?.h24 || 0,
    fdvUsd: p.fdv ?? null,
    priceChange24h: p.priceChange?.h24 ?? null,
    pairAddress: p.pairAddress,
    dex: p.dexId,
    pairCreatedAt: p.pairCreatedAt ? new Date(p.pairCreatedAt).toISOString() : null,
    symbol: p.baseToken?.symbol || "",
    name: p.baseToken?.name || "",
  };
}

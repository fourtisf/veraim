import { ENV } from "../env";
import { addressInfo, addressTxs, tokenInfo, tokenTransfers, topHolders } from "./blockscout";
import { tokenMarket, type Market } from "./dexscreener";
import { getJson } from "./http";

// Live data an agent pulls on every run. Each tool gets the token the user asked about
// and returns a compact JSON summary that goes into the model's prompt.
export type ToolCtx = { token: string | null; market: Market | null };
type Tool = (ctx: ToolCtx) => Promise<unknown>;

const pct = (n: number) => Math.round(n * 1000) / 10; // 0.1234 -> 12.3
const short = (a: string) => a.slice(0, 6) + "…" + a.slice(-4);
const needToken = (ctx: ToolCtx) => {
  if (!ctx.token) throw new Error("no token address in the question");
  return ctx.token;
};

const TOOLS: Record<string, Tool> = {
  "Price feed": async (ctx) => {
    needToken(ctx);
    const m = ctx.market;
    if (!m) return { listed: false, note: "No trading pool found for this token on Robinhood Chain." };
    return { listed: true, symbol: m.symbol, priceUsd: m.priceUsd, liquidityUsd: Math.round(m.liquidityUsd), volume24hUsd: Math.round(m.volume24hUsd), fdvUsd: m.fdvUsd, priceChange24hPct: m.priceChange24h, dex: m.dex, poolCreatedAt: m.pairCreatedAt };
  },

  "Holder map": async (ctx) => {
    const token = needToken(ctx);
    const pool = ctx.market?.pairAddress?.toLowerCase();
    const [info, holders] = await Promise.all([tokenInfo(token), topHolders(token, 25)]);
    const wallets = holders.filter((h) => h.address !== pool);
    const top10 = wallets.slice(0, 10).reduce((s, h) => s + h.share, 0);
    return {
      holders: info.holders,
      top10SharePct: pct(top10),
      poolSharePct: pool ? pct(holders.find((h) => h.address === pool)?.share || 0) : null,
      top: wallets.slice(0, 10).map((h) => ({ wallet: short(h.address), sharePct: pct(h.share), contract: h.isContract })),
    };
  },

  "Bundle scan": async (ctx) => {
    const token = needToken(ctx);
    const [info, transfers] = await Promise.all([tokenInfo(token), tokenTransfers(token, 5)]);
    if (!transfers.length) return { note: "No transfers yet." };
    const firstBlock = Math.min(...transfers.map((t) => t.block).filter(Boolean));
    const early = transfers.filter((t) => t.block && t.block <= firstBlock + 2 && t.to !== t.from);
    const supply = Number(info.totalSupply) / 10 ** info.decimals || 1;
    const byBuyer = new Map<string, number>();
    for (const t of early) byBuyer.set(t.to, (byBuyer.get(t.to) || 0) + t.amount);
    const buyers = [...byBuyer.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    // Who funded each early buyer? Shared funders suggest linked wallets.
    const funders = await Promise.all(
      buyers.map(async ([wallet]) => {
        try {
          const txs = await addressTxs(wallet);
          const incoming = txs.filter((t) => t.to === wallet && t.value > 0).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
          return incoming[0]?.from || null;
        } catch {
          return null;
        }
      })
    );
    const clusters = new Map<string, { wallets: number; share: number }>();
    buyers.forEach(([, amount], i) => {
      const f = funders[i];
      if (!f) return;
      const c = clusters.get(f) || { wallets: 0, share: 0 };
      c.wallets++;
      c.share += amount / supply;
      clusters.set(f, c);
    });
    const linked = [...clusters.entries()].filter(([, c]) => c.wallets > 1);
    return {
      firstBlock,
      historyComplete: transfers.length < 250,
      earlyBuyers: byBuyer.size,
      earlySharePct: pct([...byBuyer.values()].reduce((s, v) => s + v, 0) / supply),
      linkedGroups: linked.map(([funder, c]) => ({ funder: short(funder), wallets: c.wallets, sharePct: pct(c.share) })),
      linkedSharePct: pct(linked.reduce((s, [, c]) => s + c.share, 0)),
    };
  },

  "Dev history": async (ctx) => {
    const token = needToken(ctx);
    const { creator } = await addressInfo(token);
    if (!creator) return { note: "Deployer not found." };
    const created = (await addressTxs(creator)).filter((t) => t.created).slice(0, 12);
    const launches = await Promise.all(
      created.map(async (t) => {
        let m: Market | null = null;
        try {
          m = await tokenMarket(t.created!, 300_000);
        } catch {}
        return { token: short(t.created!), date: t.timestamp?.slice(0, 10), liquidityUsd: m ? Math.round(m.liquidityUsd) : 0, alive: !!m && m.liquidityUsd >= 1000 };
      })
    );
    return { deployer: short(creator), launches: launches.length, dead: launches.filter((l) => !l.alive).length, recent: launches.slice(0, 8) };
  },

  "Whale flow": async (ctx) => {
    const token = needToken(ctx);
    const m = ctx.market;
    if (!m) return { note: "No trading pool, so no buys or sells to track." };
    const pool = m.pairAddress.toLowerCase();
    const since = Date.now() - 24 * 3600_000;
    const recent = (await tokenTransfers(token, 3)).filter((t) => new Date(t.timestamp).getTime() >= since);
    const net = new Map<string, number>();
    for (const t of recent) {
      if (t.from === pool) net.set(t.to, (net.get(t.to) || 0) + t.amount * m.priceUsd);
      if (t.to === pool) net.set(t.from, (net.get(t.from) || 0) - t.amount * m.priceUsd);
    }
    const flows = [...net.entries()].filter(([, v]) => Math.abs(v) >= 1000).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    return {
      window: "24h",
      netFlowUsd: Math.round(flows.reduce((s, [, v]) => s + v, 0)),
      bigBuyers: flows.filter(([, v]) => v > 0).slice(0, 5).map(([w, v]) => ({ wallet: short(w), netUsd: Math.round(v) })),
      bigSellers: flows.filter(([, v]) => v < 0).slice(0, 5).map(([w, v]) => ({ wallet: short(w), netUsd: Math.round(v) })),
    };
  },

  "X mentions": async (ctx) => {
    if (!ENV.xBearer) return { unavailable: true, note: "X data is not connected yet." };
    const symbol = ctx.market?.symbol;
    if (!symbol) throw new Error("no ticker to search for");
    const q = encodeURIComponent(`$${symbol} -is:retweet`);
    const data = await getJson<any>(
      `https://api.x.com/2/tweets/search/recent?query=${q}&max_results=100&tweet.fields=created_at&expansions=author_id&user.fields=public_metrics,username`,
      { ttlMs: 300_000, headers: { authorization: `Bearer ${ENV.xBearer}` } }
    );
    const tweets: any[] = data.data || [];
    const users: any[] = data.includes?.users || [];
    const lastHour = tweets.filter((t) => Date.now() - new Date(t.created_at).getTime() < 3600_000).length;
    const top = users.sort((a, b) => (b.public_metrics?.followers_count || 0) - (a.public_metrics?.followers_count || 0)).slice(0, 5);
    return { postsSampled: tweets.length, postsLastHour: lastHour, topAccounts: top.map((u) => ({ user: "@" + u.username, followers: u.public_metrics?.followers_count })) };
  },
};

export const TOOL_NAMES = Object.keys(TOOLS);

export async function runTools(names: string[], ctx: ToolCtx) {
  const results: Record<string, unknown> = {};
  await Promise.all(
    names.filter((n) => TOOLS[n]).map(async (n) => {
      try {
        results[n] = await Promise.race([TOOLS[n](ctx), new Promise((_, rej) => setTimeout(() => rej(new Error("timed out")), 15_000))]);
      } catch (err) {
        results[n] = { error: err instanceof Error ? err.message : "failed" };
      }
    })
  );
  return results;
}

// Finds the token a question is about: a 0x address, or a $TICKER looked up on DexScreener.
export async function resolveToken(input: string): Promise<string | null> {
  const addr = input.match(/0x[a-fA-F0-9]{40}/)?.[0];
  if (addr) return addr.toLowerCase();
  const ticker = input.match(/\$([A-Za-z0-9]{2,12})\b/)?.[1];
  if (!ticker) return null;
  try {
    const data = await getJson<{ pairs?: any[] }>(`${ENV.dexscreenerBase}/latest/dex/search?q=${encodeURIComponent(ticker)}`, { ttlMs: 120_000 });
    const match = (data.pairs || [])
      .filter((p) => p.chainId === ENV.dexscreenerChain && p.baseToken?.symbol?.toUpperCase() === ticker.toUpperCase())
      .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
    return match?.baseToken?.address?.toLowerCase() || null;
  } catch {
    return null;
  }
}

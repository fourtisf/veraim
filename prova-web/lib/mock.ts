// All mock data for the launch site lives here.
// Phase 2 replaces these exports with API calls; components only import from this file.

export type CallStatus = "hit" | "miss" | "open";
// [subject, claim, status, age]
export type PastCall = [string, string, CallStatus, string];

export type Agent = {
  id: string;
  n: string; // name
  t: string; // ticker
  tag: string;
  cat: string;
  c: [string, string]; // avatar gradient
  tr: number; // track record %
  g: number; // graded calls
  runs: number; // runs / 7d
  mc: number; // market cap, $M
  ch: number; // 24h change %
  bb: number; // bought back, $
  age: number; // days live
  calls: PastCall[];
  ask: string[];
  reply: { text: string; claim: string };
};

export const AGENTS: Agent[] = [
  {
    id: "hound", n: "Bundle Hound", t: "HOUND", tag: "Flags bundled launches before you buy", cat: "Security",
    c: ["#8FA3FF", "#2B3A9E"], tr: 84, g: 412, runs: 18400, mc: 1.92, ch: 12.4, bb: 8420, age: 41,
    calls: [["$PONGO", "SAFE · 3.1% linked supply", "hit", "2h"], ["$MOONR", "BUNDLED · 38% first block", "hit", "5h"], ["$CRWC", "CAUTION · fresh deployer", "open", "6h"], ["$GRIFT", "SAFE · 4.4% linked", "miss", "1d"], ["$NVDOG", "BUNDLED · 22 linked wallets", "hit", "1d"]],
    ask: ["Check $CRWC", "Is $PONGO bundled?", "Scan the newest launch"],
    reply: {
      text: "Scanned 1,284 holders. 7 wallets funded from one source bought 26.3% of supply in block 1. The deployer has 3 prior launches, 2 abandoned inside 48h.",
      claim: "BUNDLED · sealed 0x9c2…a41 · graded in 24h",
    },
  },
  {
    id: "tide", n: "Tidewatch", t: "TIDE", tag: "Calls whale entries on Robinhood Chain", cat: "Trading calls",
    c: ["#7FE3B4", "#146B48"], tr: 71, g: 268, runs: 26100, mc: 4.3, ch: -3.1, bb: 12900, age: 58,
    calls: [["$ORBIO", "LONG · 3 whales in, 7d", "hit", "3h"], ["$PONS", "LONG · accumulation", "open", "8h"], ["$TSLA-x", "SHORT · exits building", "miss", "1d"], ["$LONG", "LONG · 412 ETH inflow", "hit", "2d"], ["$CC", "LONG · smart money", "hit", "3d"]],
    ask: ["What are whales buying?", "Any exits on $PONS?", "Top inflow last 6h"],
    reply: {
      text: "Three wallets with a 68% historical win rate added 142 ETH to $ORBIO in the last 4 hours, with no matching exits. Strongest net inflow on the chain today.",
      claim: "$ORBIO LONG · 7d · sealed 0x41f…c08",
    },
  },
  {
    id: "dev", n: "Dev Ledger", t: "DEVL", tag: "Scores a deployer from every past launch", cat: "Security",
    c: ["#FF9AAE", "#8E2238"], tr: 79, g: 301, runs: 14200, mc: 1.24, ch: 4.2, bb: 5020, age: 36,
    calls: [["0x3a…91f", "Serial rugger · 9/11 dead", "hit", "1h"], ["0xb2…07c", "Clean · 2 graduated", "hit", "7h"], ["0x9e…c3d", "Unknown · first launch", "open", "9h"], ["0x11…ad2", "Clean", "miss", "2d"]],
    ask: ["Score 0x3a…91f", "Who launched $CRWC?", "Check the newest dev"],
    reply: {
      text: "This deployer launched 11 tokens in 19 days. 9 lost over 90% within 72 hours and liquidity was pulled from 6. Funding traced to the same exchange hot wallet each time.",
      claim: "HIGH RISK · sealed 0xd40…b3e",
    },
  },
  {
    id: "deep", n: "Deepstack", t: "DEEP", tag: "A one-page research brief on any token", cat: "Research",
    c: ["#C9B2FF", "#4E2E9E"], tr: 66, g: 93, runs: 9800, mc: 0.88, ch: 31.8, bb: 3110, age: 17,
    calls: [["$ORBIO", "Revenue claim checks out", "hit", "4h"], ["$LONG", "Team wallets unlocked early", "hit", "1d"], ["$SHRM", "Roadmap unfunded", "open", "2d"], ["$PONS", "Fee data overstated", "miss", "3d"]],
    ask: ["Brief me on $ORBIO", "Is $SHRM legit?", "PONS vs LONG"],
    reply: {
      text: "Orbio routes requests through OpenRouter, so its edge is pricing and access, not models. The fee-to-credit mechanic is live and verifiable. Main risk: demand still depends on token volume.",
      claim: "Fee mechanic active · sealed 0x77a…e19",
    },
  },
  {
    id: "grad", n: "Gradwatch", t: "GRAD", tag: "Predicts which curves will graduate", cat: "Trading calls",
    c: ["#8FE3F0", "#0F6272"], tr: 62, g: 57, runs: 4100, mc: 0.31, ch: 52.0, bb: 960, age: 6,
    calls: [["$KIWI", "Graduates < 12h", "hit", "5h"], ["$SLAB", "Stalls at 60%", "open", "8h"], ["$BLIP", "Graduates < 6h", "miss", "1d"]],
    ask: ["Which curve graduates next?", "Odds on $SLAB", "Fastest curves now"],
    reply: {
      text: "$SLAB is at 61% of its curve but buy velocity fell 70% in the last hour and 2 top holders sit in profit. Most likely stalls below 70%.",
      claim: "$SLAB no graduation 24h · sealed 0x5e1…0aa",
    },
  },
  {
    id: "loud", n: "Loudroom", t: "LOUD", tag: "Spots which tickers X is about to talk about", cat: "Social",
    c: ["#FFD08A", "#9A5A12"], tr: 58, g: 144, runs: 31500, mc: 2.66, ch: -8.7, bb: 6700, age: 29,
    calls: [["$PONGO", "Mentions up 4x", "hit", "2h"], ["$CC", "KOL cluster forming", "miss", "9h"], ["$NVDOG", "Fading", "hit", "1d"], ["$ORBIO", "Mentions up 2x", "hit", "2d"]],
    ask: ["What is trending now?", "Mentions on $CC", "Who posted today?"],
    reply: {
      text: "Mentions of $PONGO rose from 40 to 172 an hour since 09:00 UTC, led by 5 accounts over 50K followers. Volume hasn't caught up yet.",
      claim: "Attention up 24h · sealed 0x2b8…f60",
    },
  },
];

export const CATS = ["All", "Trading calls", "Security", "Research", "Social"];

// Command palette "Go to" entries: [label, section, icon]
export const PAGES: [string, string, string][] = [
  ["Leaderboard", "#agents", "↗"],
  ["Live calls", "#live", "●"],
  ["Compare agents", "#compare", "⇄"],
  ["Earnings calculator", "#earn", "$"],
  ["Build an agent", "#build", "+"],
  ["API docs", "#api", "{}"],
  ["FAQ", "#faq", "?"],
];

// Hero stats: count up from 0 when scrolled into view.
// `start` is the text shown before the count-up runs.
export const STATS = [
  { to: 48210, dec: 0, pre: "", suf: "", start: "0", label: "Calls sealed onchain" },
  { to: 71.4, dec: 1, pre: "", suf: "%", start: "0%", label: "Average record, top 100" },
  { to: 212, dec: 0, pre: "$", suf: "K", start: "$0K", label: "Bought back from usage" },
  { to: 0.05, dec: 2, pre: "$", suf: "", start: "$0.00", label: "Typical price per run" },
];

// Live feed KPIs at page load.
export const FEED_START = { sealed: 1284, pending: 3912, nextBatchSeconds: 252 };

export const CODE: Record<string, string> = {
  curl: `curl https://api.prova.live/v1/agents/bundle-hound/run \\
  -H "Authorization: Bearer $PROVA_KEY" \\
  -d '{"input": "0x7a3...e91f"}'

# → { "verdict": "BUNDLED", "seal": "0x9c2…a41",
#     "grades_at": "2026-09-29T14:02Z" }`,
  js: `import { Prova } from "@prova/sdk";

const prova = new Prova({ apiKey: process.env.PROVA_KEY });

const res = await prova.agents.run("bundle-hound", {
  input: "0x7a3...e91f",
});

console.log(res.verdict, res.seal); // BUNDLED 0x9c2…a41`,
  py: `import os
from prova import Prova

prova = Prova(api_key=os.environ["PROVA_KEY"])

res = prova.agents.run("bundle-hound", input="0x7a3...e91f")
print(res.verdict, res.seal)  # BUNDLED 0x9c2…a41`,
  mcp: `{
  "mcpServers": {
    "prova": {
      "url": "https://mcp.prova.live",
      "headers": { "Authorization": "Bearer $PROVA_KEY" }
    }
  }
}`,
};

export const CODE_LANGS: [string, string][] = [
  ["curl", "cURL"],
  ["js", "JavaScript"],
  ["py", "Python"],
  ["mcp", "MCP"],
];

/* ---------- live call generator (ticker + feed) ---------- */

export type Rand = () => number;

// Small seeded random so the server and browser render the same first frame.
export function seeded(seed: number): Rand {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = (r: Rand, a: number, b: number) => Math.floor(r() * (b - a + 1)) + a;
export const hex = (r: Rand = Math.random) =>
  "0x" + r().toString(16).slice(2, 5).padEnd(3, "0") + "…" + r().toString(16).slice(2, 5).padEnd(3, "0");

export function randomCall(r: Rand = Math.random) {
  const a = AGENTS[rnd(r, 0, AGENTS.length - 1)];
  const c = a.calls[rnd(r, 0, a.calls.length - 1)];
  return { a, c };
}

export type TickerItem = { id: number; a: Agent; subject: string; verdict: string; hash: string };

export function tickerItems(r: Rand, count = 14): TickerItem[] {
  return Array.from({ length: count }, (_, id) => {
    const { a, c } = randomCall(r);
    return { id, a, subject: c[0], verdict: c[1].split(" · ")[0], hash: hex(r) };
  });
}

export type FeedItem = { id: number; a: Agent; claim: string; st: CallStatus; hash: string; h: number; m: number };

let feedId = 0;
export function newFeedItem(r: Rand = Math.random): FeedItem {
  const { a, c } = randomCall(r);
  const graded = r() < 0.35;
  return {
    id: feedId++,
    a,
    claim: `${c[0]} · ${c[1]}`,
    st: graded ? (r() < a.tr / 100 ? "hit" : "miss") : "open",
    hash: hex(r),
    h: rnd(r, 2, 23),
    m: rnd(r, 0, 59),
  };
}

/* ---------- formatting and chart data ---------- */

export const k = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1).replace(".0", "") + "K" : String(n));

export const money = (n: number) =>
  n >= 1e6 ? "$" + (n / 1e6).toFixed(2) + "M"
  : n >= 1e4 ? "$" + Math.round(n / 1e3) + "K"
  : n >= 1e3 ? "$" + (n / 1e3).toFixed(1) + "K"
  : "$" + Math.round(n).toLocaleString("en-US");

// 30-day track record series for charts (deterministic per agent).
export function series(a: Agent, n = 30) {
  const s: number[] = [];
  let seed = a.g * 13 + a.tr;
  let v = a.tr - 10;
  for (let i = 0; i < n; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    v += (seed / 233280 - 0.45) * 3.2 + (a.tr - v) * 0.12;
    s.push(Math.max(40, Math.min(96, v)));
  }
  s[n - 1] = a.tr;
  return s;
}

// Last-12 hit/miss pattern for the leaderboard dots (true = hit).
export function dots(a: Agent) {
  const h = Math.round((a.tr / 100) * 12);
  return Array.from({ length: 12 }, (_, i) => (i * 7 + a.g) % 12 < h);
}

// Points for the small 7d sparkline in the hero window.
export function sparkPoints(seed: number) {
  const p: string[] = [];
  let v = 10;
  for (let i = 0; i < 14; i++) {
    v += Math.sin(seed * 1.7 + i * 1.3) * 3 + ((seed * i) % 5 - 1.5);
    v = Math.max(2, Math.min(20, v));
    p.push(`${i * 6},${22 - v}`);
  }
  return p.join(" ");
}

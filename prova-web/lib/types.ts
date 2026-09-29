// Shapes the server sends to the browser.
export type CallStatus = "ungraded" | "open" | "hit" | "miss" | "void";

export type AgentView = {
  id: string;
  seq: number;
  slug: string;
  name: string;
  ticker: string;
  tagline: string;
  category: string;
  colors: [string, string];
  model: string;
  modelKey: string;
  modelReady: boolean;
  tools: string[];
  gradingMode: string;
  gradingLabel: string;
  price: number;
  official: boolean;
  creator: string | null; // creator wallet (lowercase)
  tokenAddress: string | null;
  tokenSymbol: string | null;
  marketCapUsd: number | null;
  priceUsd: number | null;
  priceChange24h: number | null;
  boughtBackUsd: number;
  paidRuns7d: number;
  createdAt: string;
  ageDays: number;
  trackRecord: number | null; // % of weighted graded calls that hit
  graded: number;
  hits: number;
  misses: number;
  open: number;
  ranked: boolean;
  runs7d: number; // runs by users (not the autopilot)
  calls7d: number; // calls made, from users and the autopilot
  callsTotal: number;
  last12: ("hit" | "miss")[];
};

export type CallView = {
  id: string;
  agent: { slug: string; name: string; colors: [string, string] };
  input: string;
  output: string;
  label: string | null;
  subject: string | null;
  status: CallStatus;
  claimHash: string | null;
  sealTx: string | null;
  sealUrl: string | null;
  sealedAt: string | null;
  gradesAt: string | null;
  gradedAt: string | null;
  gradeTx: string | null;
  priceChangePct: number | null;
  createdAt: string;
};

export type SiteStats = {
  agentCount: number;
  sealedCalls: number;
  avgTopRecord: number | null;
  boughtBackUsd: number;
  typicalPrice: number;
  sealedToday: number;
  sealedYesterday: number;
  hitRate24h: number | null;
  pending: number;
  calls24h: number;
  waitlistCount: number;
};

export type Me = {
  wallet: string;
  admin: boolean;
  watch: string[];
  alerts: string[];
  telegramLinked: boolean;
  telegramReady: boolean;
} | null;

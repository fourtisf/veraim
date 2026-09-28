// Models an agent can run on. Labels are shown in the builder; the provider model IDs
// live in lib/server/llm.ts and can be overridden in .env.
export const MODEL_OPTIONS: { key: string; label: string }[] = [
  { key: "claude-sonnet", label: "Claude Sonnet" },
  { key: "gpt", label: "GPT class" },
  { key: "llama-70b", label: "Llama 70B (cheapest)" },
  { key: "deepseek", label: "DeepSeek" },
];

export const modelLabel = (key: string) => MODEL_OPTIONS.find((m) => m.key === key)?.label || key;

// Tools an agent can use (builder checkboxes). Keys are stored on the agent.
export const TOOL_OPTIONS: [string, string][] = [
  ["Holder map", "Top holders and linked wallets"],
  ["Bundle scan", "First-block buys and funding"],
  ["Whale flow", "Large buys and sells live"],
  ["Dev history", "Deployer's past launches"],
  ["Price feed", "Price, volume, liquidity"],
  ["X mentions", "Who's posting about it"],
];

export const CATEGORIES = ["Security", "Trading calls", "Research", "Social"];

// What gets graded (builder step 2).
export const GRADING_OPTIONS: { key: string; label: string }[] = [
  { key: "verdict24h", label: "Verdict vs 24h outcome" },
  { key: "price7d", label: "Price call vs 7d price" },
  { key: "none", label: "Not graded" },
];

export const gradingLabel = (key: string) => GRADING_OPTIONS.find((g) => g.key === key)?.label || key;

export const PRICE_OPTIONS = [0.02, 0.05, 0.1, 0.25];

// Leaderboard rules (from the FAQ).
export const MIN_GRADED_TO_RANK = 30;
export const FREE_RUNS_PER_AGENT = 5;

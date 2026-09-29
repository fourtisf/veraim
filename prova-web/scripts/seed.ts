// Creates (or updates) Veraim's official starter agents. Safe to run more than once.
// Slugs stay the same as before (bundle-hound, …) so links and call history keep working.
// Run: npx tsx scripts/seed.ts
import "dotenv/config";
import { prisma } from "../lib/db";

const AGENTS = [
  {
    slug: "bundle-hound",
    name: "Veraim Safety Agent",
    ticker: "VSAFE",
    tagline: "Flags bundled launches before you buy",
    category: "Security",
    gradingMode: "verdict24h",
    model: "claude-sonnet",
    tools: ["Holder map", "Bundle scan", "Dev history", "Price feed"],
    instructions:
      "Given a token, check holder distribution, first-block buyers and who funded them, and the deployer's past launches. Call it BUNDLED (verdict RISKY) if linked wallets bought more than 20% of supply in the first blocks, CAUTION if 8-20% or the deployer has dead launches, otherwise SAFE. Give one line of reasoning with the key numbers.",
  },
  {
    slug: "tidewatch",
    name: "Veraim Whale Agent",
    ticker: "VWHALE",
    tagline: "Calls whale entries on Robinhood Chain",
    category: "Trading calls",
    gradingMode: "price7d",
    model: "claude-sonnet",
    tools: ["Whale flow", "Price feed", "Holder map"],
    instructions:
      "Read the last 24h of large buys and sells and the current market. Call LONG when big wallets are net buying with no matching exits and liquidity is healthy; SHORT when large holders are exiting. Name the net flow in USD and the biggest wallets in one or two sentences.",
  },
  {
    slug: "dev-ledger",
    name: "Veraim Dev Agent",
    ticker: "VDEV",
    tagline: "Scores a deployer from every past launch",
    category: "Security",
    gradingMode: "verdict24h",
    model: "claude-sonnet",
    tools: ["Dev history", "Price feed"],
    instructions:
      "Find who deployed the token and review every contract they launched before. If most past launches are dead (no liquidity), label it SERIAL RUGGER with verdict RISKY. Mixed history is CAUTION. A clean or first-time deployer with healthy liquidity is SAFE. Say how many launches and how many died.",
  },
  {
    slug: "deepstack",
    name: "Veraim Research Agent",
    ticker: "VRES",
    tagline: "A one-page research brief on any token",
    category: "Research",
    gradingMode: "price7d",
    model: "claude-sonnet",
    tools: ["Price feed", "Holder map", "Bundle scan", "Dev history", "Whale flow"],
    instructions:
      "Write a tight research brief: market (price, liquidity, volume), holder concentration, launch quality and recent whale flow. End with a 7-day LONG or SHORT view and the single biggest risk.",
  },
];

async function main() {
  for (const a of AGENTS) {
    await prisma.agent.upsert({ where: { slug: a.slug }, update: { ...a, official: true }, create: { ...a, official: true } });
    console.log("ok", a.name);
  }
}

main().finally(() => prisma.$disconnect());

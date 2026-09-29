
// All server settings, read from .env. See .env.example for what each one does.
const e = process.env;
const num = (v: string | undefined, d: number) => (v && !isNaN(+v) ? +v : d);

export const ENV = {
  siteUrl: e.NEXT_PUBLIC_SITE_URL || "https://veraim.xyz",
  sessionSecret: e.SESSION_SECRET || "",
  adminWallets: (e.ADMIN_WALLETS || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean),

  // AI models
  // An OpenRouter key (sk-or-…) pasted into ANTHROPIC_API_KEY is used as the OpenRouter key instead.
  anthropicKey: (e.ANTHROPIC_API_KEY || "").startsWith("sk-or-") ? "" : e.ANTHROPIC_API_KEY || "",
  anthropicBase: e.ANTHROPIC_BASE_URL || "",
  // How hard the model thinks before answering: low answers fastest (low | medium | high).
  llmEffort: (["low", "medium", "high"].includes(e.LLM_EFFORT || "") ? e.LLM_EFFORT : "low") as "low" | "medium" | "high",
  openrouterKey: e.OPENROUTER_API_KEY || ((e.ANTHROPIC_API_KEY || "").startsWith("sk-or-") ? e.ANTHROPIC_API_KEY! : ""),
  openrouterBase: (e.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, ""),

  // Chain
  chain: e.CHAIN || "robinhood", // robinhood | robinhoodTestnet | local
  rpcUrl: e.RPC_URL || "",
  sealContract: (e.SEAL_CONTRACT || "") as `0x${string}` | "",
  runsContract: (e.RUNS_CONTRACT || "") as `0x${string}` | "",
  treasury: (e.TREASURY_ADDRESS || "") as `0x${string}` | "",
  // USDG on Robinhood Chain (6 decimals). Mainnet default; set USDG_ADDRESS for testnet/local.
  usdg: (e.USDG_ADDRESS || "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168") as `0x${string}`,
  // Buybacks: a Uniswap v3 SwapRouter02-compatible router and WETH on this chain.
  swapRouter: (e.SWAP_ROUTER || "") as `0x${string}` | "",
  weth: (e.WETH_ADDRESS || "") as `0x${string}` | "",
  buybackFee: num(e.BUYBACK_POOL_FEE, 0), // only if the pool fee can't be read onchain
  buybackMinUsd: num(e.BUYBACK_MIN_USD, 5),
  buybackEveryMinutes: num(e.BUYBACK_EVERY_MINUTES, 60),
  buybackSlippage: num(e.BUYBACK_SLIPPAGE, 0.05),
  ethUsdOverride: num(e.ETH_USD_PRICE, 0), // for local testing only
  sealerKey: (e.SEALER_PRIVATE_KEY || "") as `0x${string}` | "",
  explorerUrl: (e.EXPLORER_URL || "https://robinhoodchain.blockscout.com").replace(/\/$/, ""),
  blockscoutApi: (e.BLOCKSCOUT_API_URL || "https://robinhoodchain.blockscout.com/api/v2").replace(/\/$/, ""),
  dexscreenerChain: e.DEXSCREENER_CHAIN || "robinhood",
  dexscreenerBase: (e.DEXSCREENER_API_URL || "https://api.dexscreener.com").replace(/\/$/, ""),

  // Product rules
  minLiquidityUsd: num(e.MIN_LIQUIDITY_USD, 10000),
  runsPerHourPerWallet: num(e.RUNS_PER_HOUR_PER_WALLET, 20),
  runsPerHourPerIp: num(e.RUNS_PER_HOUR_PER_IP, 40),
  maxRunsPerDay: num(e.MAX_RUNS_PER_DAY, 2000), // cost guard across all users

  // Autopilot: official agents analyse the biggest live tokens on their own (0 = off)
  autopilotPerAgentPerDay: num(e.AUTOPILOT_RUNS_PER_AGENT_PER_DAY, 0),
  autopilotTokens: (e.AUTOPILOT_TOKENS || "").split(",").map((s) => s.trim()).filter((s) => /^0x[0-9a-fA-F]{40}$/.test(s)),

  // Optional integrations
  telegramToken: e.TELEGRAM_BOT_TOKEN || "",
  telegramBot: e.TELEGRAM_BOT_USERNAME || "",
  telegramApi: (e.TELEGRAM_API_URL || "https://api.telegram.org").replace(/\/$/, ""),
  xBearer: e.X_BEARER_TOKEN || "",
  smtpUrl: e.SMTP_URL || "",
  mailFrom: e.MAIL_FROM || "",
};

export const explorerTx = (tx: string) => `${ENV.explorerUrl}/tx/${tx}`;

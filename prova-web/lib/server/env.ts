
// All server settings, read from .env. See .env.example for what each one does.
const e = process.env;
const num = (v: string | undefined, d: number) => (v && !isNaN(+v) ? +v : d);

export const ENV = {
  siteUrl: e.NEXT_PUBLIC_SITE_URL || "https://prova.live",
  sessionSecret: e.SESSION_SECRET || "",
  adminWallets: (e.ADMIN_WALLETS || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean),

  // AI models
  anthropicKey: e.ANTHROPIC_API_KEY || "",
  anthropicBase: e.ANTHROPIC_BASE_URL || "",
  openrouterKey: e.OPENROUTER_API_KEY || "",
  openrouterBase: (e.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, ""),

  // Chain
  chain: e.CHAIN || "robinhood", // robinhood | robinhoodTestnet | local
  rpcUrl: e.RPC_URL || "",
  sealContract: (e.SEAL_CONTRACT || "") as `0x${string}` | "",
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

  // Optional integrations
  telegramToken: e.TELEGRAM_BOT_TOKEN || "",
  telegramBot: e.TELEGRAM_BOT_USERNAME || "",
  telegramApi: (e.TELEGRAM_API_URL || "https://api.telegram.org").replace(/\/$/, ""),
  xBearer: e.X_BEARER_TOKEN || "",
  smtpUrl: e.SMTP_URL || "",
  mailFrom: e.MAIL_FROM || "",
};

export const explorerTx = (tx: string) => `${ENV.explorerUrl}/tx/${tx}`;

import { createPublicClient, createWalletClient, defineChain, http, type Abi, type Chain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { robinhood, robinhoodTestnet } from "viem/chains";
import { ENV } from "./env";
import RunsArtifact from "@/contracts/VeraimRuns.json";
import SealArtifact from "@/contracts/VeraimSeal.json";

export const SEAL_ABI = SealArtifact.abi as Abi;
export const RUNS_ABI = RunsArtifact.abi as Abi;

export function chain(): Chain {
  if (ENV.chain === "robinhoodTestnet") return robinhoodTestnet;
  if (ENV.chain === "local") {
    return defineChain({ id: 1337, name: "Local", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [ENV.rpcUrl || "http://127.0.0.1:8545"] } } });
  }
  return robinhood;
}

const transport = () => http(ENV.rpcUrl || undefined, { timeout: 20_000 });

let pub: ReturnType<typeof createPublicClient> | null = null;
export function publicClient() {
  pub ??= createPublicClient({ chain: chain(), transport: transport() });
  return pub;
}

// Wallet that pays gas for seals. Null until SEALER_PRIVATE_KEY and SEAL_CONTRACT are set.
export function sealerClient() {
  if (!ENV.sealerKey || !ENV.sealContract) return null;
  return createWalletClient({ account: privateKeyToAccount(ENV.sealerKey), chain: chain(), transport: transport() });
}

export const sealingEnabled = () => !!(ENV.sealerKey && ENV.sealContract);

// Paid runs are on when the VeraimRuns contract is configured.
export const paymentsEnabled = () => !!ENV.runsContract;

// What the browser needs to send payments and withdrawals.
export function chainInfo() {
  const c = chain();
  return {
    chainId: c.id,
    name: c.name,
    rpcUrl: ENV.rpcUrl || c.rpcUrls.default.http[0],
    explorer: ENV.explorerUrl,
    runsContract: ENV.runsContract || null,
    usdg: ENV.usdg,
    enabled: paymentsEnabled(),
  };
}
export type ChainInfo = ReturnType<typeof chainInfo>;

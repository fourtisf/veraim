// Browser wallet transactions: paying for runs and withdrawing earnings on ProvaRuns.
import { encodeFunctionData, type Abi } from "viem";

export type ChainInfo = { chainId: number; name: string; rpcUrl: string; explorer: string; runsContract: string | null; usdg: string; enabled: boolean };
export type Quote = { ref: string; quantity: number; asset: "ETH" | "USDG"; amount: string; amountUsd: number; agentSeq: number };

const ZERO = "0x0000000000000000000000000000000000000000";
const RUNS_ABI = [
  { type: "function", name: "payRuns", stateMutability: "payable", inputs: [{ type: "uint256" }, { type: "uint32" }, { type: "bytes32" }], outputs: [] },
  { type: "function", name: "payRunsUsdg", stateMutability: "nonpayable", inputs: [{ type: "uint256" }, { type: "uint32" }, { type: "bytes32" }, { type: "uint256" }], outputs: [] },
  { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [{ type: "address" }], outputs: [] },
  { type: "function", name: "withdrawTreasury", stateMutability: "nonpayable", inputs: [{ type: "address" }], outputs: [] },
] as const satisfies Abi;
const ERC20_ABI = [
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ type: "address" }, { type: "address" }], outputs: [{ type: "uint256" }] },
] as const satisfies Abi;

type Eth = { request: (a: { method: string; params?: unknown[] }) => Promise<any> };
function eth(): Eth {
  const e = (window as any).ethereum as Eth | undefined;
  if (!e) throw new Error("No wallet found. Open Prova in your wallet app's browser.");
  return e;
}
const hex = (n: bigint | number) => "0x" + BigInt(n).toString(16);

// Makes sure the wallet is on Robinhood Chain (adds it if the wallet doesn't know it yet).
export async function ensureChain(chain: ChainInfo) {
  const current = parseInt(await eth().request({ method: "eth_chainId" }), 16);
  if (current === chain.chainId) return;
  try {
    await eth().request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex(chain.chainId) }] });
  } catch (err) {
    if ((err as { code?: number }).code !== 4902) throw err;
    await eth().request({
      method: "wallet_addEthereumChain",
      params: [{ chainId: hex(chain.chainId), chainName: chain.name, nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: [chain.rpcUrl], blockExplorerUrls: [chain.explorer] }],
    });
  }
}

async function account() {
  const [a] = await eth().request({ method: "eth_requestAccounts" });
  return a as string;
}

async function send(tx: { to: string; data: string; value?: bigint }) {
  const from = await account();
  return (await eth().request({ method: "eth_sendTransaction", params: [{ from, to: tx.to, data: tx.data, value: hex(tx.value || 0n) }] })) as `0x${string}`;
}

async function waitFor(hash: string) {
  for (let i = 0; i < 90; i++) {
    const r = await eth().request({ method: "eth_getTransactionReceipt", params: [hash] });
    if (r) {
      if (r.status !== "0x1") throw new Error("The transaction failed.");
      return;
    }
    await new Promise((res) => setTimeout(res, 1500));
  }
  throw new Error("The transaction is taking too long. Check your wallet.");
}

// Pays a quote. USDG needs an approval first (one extra wallet prompt).
export async function payQuote(quote: Quote, chain: ChainInfo) {
  if (!chain.runsContract) throw new Error("Paid runs aren't switched on yet.");
  await ensureChain(chain);
  const amount = BigInt(quote.amount);
  if (quote.asset === "ETH") {
    return send({ to: chain.runsContract, value: amount, data: encodeFunctionData({ abi: RUNS_ABI, functionName: "payRuns", args: [BigInt(quote.agentSeq), quote.quantity, quote.ref as `0x${string}`] }) });
  }
  const from = await account();
  const allowance = BigInt(
    await eth().request({ method: "eth_call", params: [{ to: chain.usdg, data: encodeFunctionData({ abi: ERC20_ABI, functionName: "allowance", args: [from as `0x${string}`, chain.runsContract as `0x${string}`] }) }, "latest"] })
  );
  if (allowance < amount) {
    await waitFor(await send({ to: chain.usdg, data: encodeFunctionData({ abi: ERC20_ABI, functionName: "approve", args: [chain.runsContract as `0x${string}`, amount] }) }));
  }
  return send({ to: chain.runsContract, data: encodeFunctionData({ abi: RUNS_ABI, functionName: "payRunsUsdg", args: [BigInt(quote.agentSeq), quote.quantity, quote.ref as `0x${string}`, amount] }) });
}

// Creators withdraw their share; anyone can push the treasury share to the treasury.
export async function withdrawFunds(chain: ChainInfo, asset: "ETH" | "USDG", treasury = false) {
  if (!chain.runsContract) throw new Error("Payments aren't switched on yet.");
  await ensureChain(chain);
  const assetAddr = (asset === "ETH" ? ZERO : chain.usdg) as `0x${string}`;
  const hash = await send({ to: chain.runsContract, data: encodeFunctionData({ abi: RUNS_ABI, functionName: treasury ? "withdrawTreasury" : "withdraw", args: [assetAddr] }) });
  await waitFor(hash);
  return hash;
}

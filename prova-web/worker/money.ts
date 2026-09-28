// Worker jobs for paid runs and buybacks (VeraimRuns contract).
import { encodeFunctionData, erc20Abi, parseEventLogs, type Abi } from "viem";
import { prisma } from "@/lib/db";
import { publicClient, RUNS_ABI, sealerClient } from "@/lib/server/chain";
import { ENV } from "@/lib/server/env";
import { creditPayment, runsPaidLogs } from "@/lib/server/payments";
import { ethUsd } from "@/lib/server/prices";
import { tokenMarket } from "@/lib/server/tools/dexscreener";

const log = (...a: unknown[]) => console.log(new Date().toISOString(), ...a);
const ETH = "0x0000000000000000000000000000000000000000" as const;
const BURN = "0x000000000000000000000000000000000000dEaD" as const;
const runs = () => ENV.runsContract as `0x${string}`;
export const moneyEnabled = () => !!(ENV.runsContract && ENV.sealerKey);

async function write(functionName: string, args: readonly unknown[]) {
  const wallet = sealerClient()!;
  const { request } = await publicClient().simulateContract({ address: runs(), abi: RUNS_ABI, functionName, args, account: wallet.account });
  const hash = await wallet.writeContract(request);
  const receipt = await publicClient().waitForTransactionReceipt({ hash, timeout: 120_000 });
  if (receipt.status !== "success") throw new Error(`${functionName} reverted: ${hash}`);
  return receipt;
}

// New agents: record who gets the creator share (official agents pay the treasury).
export async function registerAgents() {
  if (!moneyEnabled()) return;
  const todo = await prisma.agent.findMany({ where: { registeredTx: null }, include: { creator: true }, take: 50 });
  if (!todo.length) return;
  const treasury = (ENV.treasury || sealerClient()!.account.address) as `0x${string}`;
  const pending = [];
  for (const a of todo) {
    const [creator] = (await publicClient().readContract({ address: runs(), abi: RUNS_ABI, functionName: "agents", args: [BigInt(a.seq)] })) as readonly [string, string];
    if (creator !== ETH) await prisma.agent.update({ where: { id: a.id }, data: { registeredTx: "onchain" } });
    else pending.push(a);
  }
  if (!pending.length) return;
  const receipt = await write("setAgents", [pending.map((a) => BigInt(a.seq)), pending.map((a) => (a.creator?.wallet || treasury) as `0x${string}`)]);
  await prisma.agent.updateMany({ where: { id: { in: pending.map((a) => a.id) } }, data: { registeredTx: receipt.transactionHash } });
  log(`registered ${pending.length} agent(s) for payments`);
}

// Linked tokens: register once so buybacks can only ever buy that token.
export async function registerTokens() {
  if (!moneyEnabled()) return;
  const todo = await prisma.agent.findMany({ where: { tokenAddress: { not: null }, tokenTx: null, registeredTx: { not: null } }, take: 10 });
  for (const a of todo) {
    const [, token] = (await publicClient().readContract({ address: runs(), abi: RUNS_ABI, functionName: "agents", args: [BigInt(a.seq)] })) as readonly [string, string];
    if (token !== ETH) {
      await prisma.agent.update({ where: { id: a.id }, data: { tokenTx: "onchain", tokenAddress: token.toLowerCase() } });
      continue;
    }
    const receipt = await write("setAgent", [BigInt(a.seq), ETH, a.tokenAddress as `0x${string}`]);
    await prisma.agent.update({ where: { id: a.id }, data: { tokenTx: receipt.transactionHash } });
    log(`registered token ${a.tokenAddress} for ${a.slug}`);
  }
}

// Scans RunsPaid events so payments are credited even if the buyer closed the page.
export async function indexPayments() {
  if (!ENV.runsContract) return;
  const pub = publicClient();
  const latest = await pub.getBlockNumber();
  const kv = await prisma.keyValue.findUnique({ where: { key: "runs_block" } });
  let from = kv ? BigInt(kv.value) + 1n : latest > 20_000n ? latest - 20_000n : 0n;
  while (from <= latest) {
    const to = from + 5_000n > latest ? latest : from + 5_000n;
    const logs = await pub.getLogs({ address: runs(), fromBlock: from, toBlock: to });
    for (const e of runsPaidLogs(logs)) {
      const p = await creditPayment(e.args, e.txHash);
      if (p && p.createdAt.getTime() > Date.now() - 10_000) log(`credited ${p.quantity} run(s) from ${e.txHash}`);
    }
    await prisma.keyValue.upsert({ where: { key: "runs_block" }, update: { value: String(to) }, create: { key: "runs_block", value: String(to) } });
    from = to + 1n;
  }
}

const POOL_ABI = [
  { type: "function", name: "token0", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "token1", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "fee", stateMutability: "view", inputs: [], outputs: [{ type: "uint24" }] },
] as const satisfies Abi;

const ROUTER_ABI = [
  {
    type: "function",
    name: "exactInputSingle",
    stateMutability: "payable",
    inputs: [{ type: "tuple", components: [
      { name: "tokenIn", type: "address" }, { name: "tokenOut", type: "address" }, { name: "fee", type: "uint24" }, { name: "recipient", type: "address" },
      { name: "amountIn", type: "uint256" }, { name: "amountOutMinimum", type: "uint256" }, { name: "sqrtPriceLimitX96", type: "uint160" },
    ] }],
    outputs: [{ type: "uint256" }],
  },
] as const satisfies Abi;

// Spends each agent's buyback share on its token (Uniswap v3 pool) and burns what it buys.
export async function runBuybacks() {
  if (!moneyEnabled() || !ENV.swapRouter) return;
  const agents = await prisma.agent.findMany({ where: { tokenTx: { not: null }, tokenAddress: { not: null } } });
  if (!agents.length) return;
  const eth = await ethUsd();
  for (const a of agents) {
    const token = a.tokenAddress as `0x${string}`;
    for (const [asset, tokenIn, usdPerUnit, decimals] of [
      [ETH, ENV.weth, eth, 18],
      [ENV.usdg, ENV.usdg, 1, 6],
    ] as const) {
      if (!tokenIn) continue;
      try {
        await buybackOne(a, asset, tokenIn, usdPerUnit, decimals, token);
      } catch (err) {
        // one failing buyback must not block the others
        log(`buyback failed for ${a.slug} (${asset === ETH ? "ETH" : "USDG"}):`, (err as { shortMessage?: string }).shortMessage || (err as Error).message);
      }
    }
  }
}

async function buybackOne(
  a: { id: string; seq: number; slug: string },
  asset: `0x${string}`,
  tokenIn: `0x${string}`,
  usdPerUnit: number,
  decimals: number,
  token: `0x${string}`
) {
  const pub = publicClient();
  const bal = (await pub.readContract({ address: runs(), abi: RUNS_ABI, functionName: "buybackBalance", args: [asset, BigInt(a.seq)] })) as bigint;
  const usd = (Number(bal) / 10 ** decimals) * usdPerUnit;
  if (usd < ENV.buybackMinUsd) return;

  const market = await tokenMarket(token, 0).catch(() => null);
  if (!market || !(market.priceUsd > 0)) {
    log(`buyback skipped for ${a.slug}: no market price`);
    return;
  }
  // The swap must go through a v3 pool that pairs the token with what we're paying in.
  let fee = ENV.buybackFee;
  try {
    const pool = market.pairAddress as `0x${string}`;
    const [t0, t1, f] = await Promise.all([
      pub.readContract({ address: pool, abi: POOL_ABI, functionName: "token0" }),
      pub.readContract({ address: pool, abi: POOL_ABI, functionName: "token1" }),
      pub.readContract({ address: pool, abi: POOL_ABI, functionName: "fee" }),
    ]);
    const pair = [t0.toLowerCase(), t1.toLowerCase()];
    if (!pair.includes(token) || !pair.includes(tokenIn.toLowerCase())) {
      log(`buyback skipped for ${a.slug}: main pool doesn't pair it with ${asset === ETH ? "WETH" : "USDG"}`);
      return;
    }
    fee = f;
  } catch {
    if (!fee) {
      log(`buyback skipped for ${a.slug}: main pool isn't a Uniswap v3 pool`);
      return;
    }
  }
  const tokenDecimals = await pub.readContract({ address: token, abi: erc20Abi, functionName: "decimals" });
  const expected = (usd / market.priceUsd) * 10 ** tokenDecimals;
  const minOut = BigInt(Math.floor(expected * (1 - ENV.buybackSlippage)));
  const data = encodeFunctionData({
    abi: ROUTER_ABI,
    functionName: "exactInputSingle",
    args: [{ tokenIn, tokenOut: token, fee, recipient: BURN, amountIn: bal, amountOutMinimum: minOut, sqrtPriceLimitX96: 0n }],
  });
  const receipt = await write("executeBuyback", [BigInt(a.seq), asset, bal, ENV.swapRouter, data, minOut]);
  const ev = parseEventLogs({ abi: RUNS_ABI, logs: receipt.logs, eventName: "BuybackBurned" })[0] as any;
  await prisma.buyback.create({
    data: { agentId: a.id, txHash: receipt.transactionHash, asset: asset === ETH ? "ETH" : "USDG", amountIn: bal.toString(), amountUsd: usd, tokensBurned: String(ev?.args?.tokensBurned ?? 0) },
  });
  log(`bought back $${usd.toFixed(2)} of ${a.slug} and burned it (${receipt.transactionHash})`);
}

// Market cap, price and 24h change for linked tokens (shown on the leaderboard).
export async function refreshMarkets() {
  const agents = await prisma.agent.findMany({ where: { tokenAddress: { not: null } } });
  for (const a of agents) {
    try {
      const m = await tokenMarket(a.tokenAddress!, 0);
      await prisma.agent.update({
        where: { id: a.id },
        data: { marketCapUsd: m ? m.marketCapUsd ?? m.fdvUsd : null, priceUsd: m?.priceUsd ?? null, priceChange24h: m?.priceChange24h ?? null },
      });
    } catch {}
  }
}

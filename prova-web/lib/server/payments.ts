import type { Agent, User } from "@prisma/client";
import { parseEventLogs, type Log } from "viem";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { publicClient, RUNS_ABI } from "./chain";
import { ENV } from "./env";
import { ethUsd } from "./prices";

export const RUN_PACKS = [1, 10, 50];
export class PaymentError extends Error {}

// Paid runs bought minus paid runs used, for one wallet and agent.
export async function paidRunsLeft(userId: string, agentId: string) {
  const [bought, used] = await Promise.all([
    prisma.payment.aggregate({ where: { userId, agentId }, _sum: { quantity: true } }),
    prisma.run.count({ where: { userId, agentId, paid: true } }),
  ]);
  return (bought._sum.quantity || 0) - used;
}

// Price quote for `quantity` runs. The quote id is the bytes32 reference the wallet sends onchain.
export async function createQuote(user: User, agent: Agent, quantity: number, asset: "ETH" | "USDG") {
  if (!ENV.runsContract) throw new PaymentError("Paid runs aren't switched on yet.");
  if (!RUN_PACKS.includes(quantity)) throw new PaymentError("Pick 1, 10 or 50 runs.");
  const usd = Math.round(agent.pricePerRunUsd * quantity * 100) / 100;
  let amount: bigint;
  if (asset === "USDG") amount = BigInt(Math.round(usd * 1e6));
  else {
    const price = await ethUsd();
    // round up to the nearest gwei so the payment always covers the USD price
    amount = BigInt(Math.ceil((usd / price) * 1e9)) * 10n ** 9n;
  }
  const quote = await prisma.quote.create({
    data: {
      id: "0x" + randomBytes(32).toString("hex"),
      userId: user.id,
      agentId: agent.id,
      quantity,
      asset,
      amount: amount.toString(),
      amountUsd: usd,
      expiresAt: new Date(Date.now() + 15 * 60_000),
    },
  });
  return { ref: quote.id, quantity, asset, amount: quote.amount, amountUsd: usd, agentSeq: agent.seq, expiresAt: quote.expiresAt.toISOString() };
}

type PaidArgs = { ref: `0x${string}`; agentId: bigint; payer: `0x${string}`; asset: `0x${string}`; amount: bigint; quantity: number };

// Credits a RunsPaid event if it matches a quote exactly. Safe to call twice.
export async function creditPayment(args: PaidArgs, txHash: string) {
  const ref = args.ref.toLowerCase();
  const existing = await prisma.payment.findUnique({ where: { ref } });
  if (existing) return existing;
  const quote = await prisma.quote.findUnique({ where: { id: ref }, include: { user: true, agent: true } });
  if (!quote) return null;
  const assetAddr = quote.asset === "ETH" ? "0x0000000000000000000000000000000000000000" : ENV.usdg.toLowerCase();
  const ok =
    args.payer.toLowerCase() === quote.user.wallet &&
    Number(args.agentId) === quote.agent.seq &&
    args.asset.toLowerCase() === assetAddr &&
    args.amount >= BigInt(quote.amount) &&
    Number(args.quantity) === quote.quantity;
  if (!ok) {
    console.error("payment does not match its quote", ref, txHash);
    return null;
  }
  return prisma.payment.upsert({
    where: { ref },
    update: {},
    create: {
      ref,
      txHash,
      userId: quote.userId,
      agentId: quote.agentId,
      asset: quote.asset,
      amount: args.amount.toString(),
      amountUsd: quote.amountUsd,
      quantity: quote.quantity,
    },
  });
}

export function runsPaidLogs(logs: Log[]) {
  return parseEventLogs({ abi: RUNS_ABI, logs, eventName: "RunsPaid" })
    .filter((l) => l.address.toLowerCase() === ENV.runsContract.toLowerCase())
    .map((l: any) => ({ args: l.args as PaidArgs, txHash: l.transactionHash as string }));
}

// Called by the browser right after the wallet sends the payment.
export async function confirmPayment(user: User, txHash: `0x${string}`) {
  const receipt = await publicClient().waitForTransactionReceipt({ hash: txHash, timeout: 90_000 });
  if (receipt.status !== "success") throw new PaymentError("The payment transaction failed onchain.");
  const events = runsPaidLogs(receipt.logs);
  if (!events.length) throw new PaymentError("No Veraim payment found in that transaction.");
  let credited = 0;
  for (const e of events) {
    const p = await creditPayment(e.args, e.txHash);
    if (p && p.userId === user.id) credited += p.quantity;
  }
  if (!credited) throw new PaymentError("That payment doesn't match your quote. Contact support with the transaction hash.");
  return credited;
}

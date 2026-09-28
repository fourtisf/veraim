import { prisma } from "@/lib/db";
import { chainInfo, paymentsEnabled, publicClient, RUNS_ABI } from "@/lib/server/chain";
import { ENV } from "@/lib/server/env";
import { fail, json } from "@/lib/server/http";
import { currentUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

const ETH = "0x0000000000000000000000000000000000000000";

// Creator earnings: what the contract holds for this wallet, plus lifetime sales.
export async function GET() {
  const user = await currentUser();
  if (!user) return fail("Connect your wallet first.", 401);
  const sales = await prisma.payment.aggregate({ where: { agent: { creatorId: user.id } }, _sum: { amountUsd: true, quantity: true } });
  let eth = "0", usdg = "0";
  if (paymentsEnabled()) {
    const read = (asset: string) =>
      publicClient().readContract({ address: ENV.runsContract as `0x${string}`, abi: RUNS_ABI, functionName: "creatorBalance", args: [asset, user.wallet] }) as Promise<bigint>;
    try {
      [eth, usdg] = (await Promise.all([read(ETH), read(ENV.usdg)])).map(String);
    } catch (err) {
      console.error("earnings read failed", err);
    }
  }
  return json({ claimable: { eth, usdg }, lifetimeUsd: (sales._sum.amountUsd || 0) * 0.6, runsSold: sales._sum.quantity || 0, chain: chainInfo() });
}

import { erc20Abi, getAddress, isAddress } from "viem";
import { prisma } from "@/lib/db";
import { publicClient } from "@/lib/server/chain";
import { fail, json, readJson } from "@/lib/server/http";
import { currentUser, isAdmin } from "@/lib/server/session";
import { tokenMarket } from "@/lib/server/tools/dexscreener";

export const dynamic = "force-dynamic";

// The agent's creator (or an admin, for official agents) links the token launched for it.
// Once the worker registers it onchain it can't be changed, so buybacks always hit the same token.
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const user = await currentUser();
  if (!user) return fail("Connect your wallet first.", 401);
  const agent = await prisma.agent.findUnique({ where: { slug: params.slug } });
  if (!agent) return fail("Agent not found.", 404);
  const allowed = agent.creatorId ? agent.creatorId === user.id : isAdmin(user.wallet);
  if (!allowed) return fail("Only this agent's creator can link its token.", 403);
  if (agent.tokenTx) return fail("This agent's token is already registered onchain and can't be changed.");

  const { address } = await readJson(req);
  if (typeof address !== "string" || !isAddress(address)) return fail("Paste the token's contract address (0x…).");
  const token = getAddress(address);
  let symbol: string;
  try {
    const c = { address: token, abi: erc20Abi } as const;
    [symbol] = await Promise.all([
      publicClient().readContract({ ...c, functionName: "symbol" }),
      publicClient().readContract({ ...c, functionName: "decimals" }),
      publicClient().readContract({ ...c, functionName: "totalSupply" }),
    ]);
  } catch {
    return fail("That address isn't a token on Robinhood Chain.");
  }
  const m = await tokenMarket(token.toLowerCase(), 0).catch(() => null);
  await prisma.agent.update({
    where: { id: agent.id },
    data: { tokenAddress: token.toLowerCase(), tokenSymbol: symbol, marketCapUsd: m ? m.marketCapUsd ?? m.fdvUsd : null, priceUsd: m?.priceUsd ?? null, priceChange24h: m?.priceChange24h ?? null },
  });
  return json({ ok: true, symbol });
}

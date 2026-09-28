import { prisma } from "@/lib/db";
import { chainInfo } from "@/lib/server/chain";
import { fail, json, readJson } from "@/lib/server/http";
import { createQuote, PaymentError } from "@/lib/server/payments";
import { currentUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

// Price quote for buying runs. The wallet then pays it onchain.
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const user = await currentUser();
  if (!user) return fail("Connect your wallet first.", 401);
  const agent = await prisma.agent.findUnique({ where: { slug: params.slug } });
  if (!agent || agent.hidden) return fail("Agent not found.", 404);
  const { quantity, asset } = await readJson(req);
  try {
    const quote = await createQuote(user, agent, Number(quantity), asset === "USDG" ? "USDG" : "ETH");
    return json({ quote, chain: chainInfo() });
  } catch (err) {
    if (err instanceof PaymentError) return fail(err.message, 400);
    console.error("quote failed", err);
    return fail("Couldn't get a price right now. Please try again.", 503);
  }
}

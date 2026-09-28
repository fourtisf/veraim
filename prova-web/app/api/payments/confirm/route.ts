import { fail, json, readJson } from "@/lib/server/http";
import { confirmPayment, PaymentError } from "@/lib/server/payments";
import { currentUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Called after the wallet sends a payment: checks it onchain and credits the runs.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return fail("Connect your wallet first.", 401);
  const { txHash } = await readJson(req);
  if (typeof txHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) return fail("Invalid transaction hash.");
  try {
    return json({ credited: await confirmPayment(user, txHash as `0x${string}`) });
  } catch (err) {
    if (err instanceof PaymentError) return fail(err.message, 400);
    console.error("confirm failed", err);
    return fail("Couldn't confirm the payment yet. If it went through, your runs are added automatically within a few minutes.", 503);
  }
}

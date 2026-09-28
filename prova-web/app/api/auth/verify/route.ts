import { completeChallenge } from "@/lib/server/session";
import { fail, json, readJson } from "@/lib/server/http";
import { rateLimited } from "@/lib/rateLimit";
import { clientIp } from "@/lib/server/ip";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (rateLimited("auth:" + clientIp(req), 20, 10 * 60_000)) return fail("Too many attempts. Try again in a few minutes.", 429);
  const { signature } = await readJson(req);
  if (typeof signature !== "string" || !/^0x[0-9a-fA-F]+$/.test(signature)) return fail("Missing signature.");
  const user = await completeChallenge(signature as `0x${string}`);
  if (!user) return fail("Signature check failed. Please try again.", 401);
  return json({ ok: true, wallet: user.wallet });
}

import { isAddress } from "viem";
import { createChallenge } from "@/lib/server/session";
import { fail, json, readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { address } = await readJson(req);
  if (typeof address !== "string" || !isAddress(address)) return fail("Invalid wallet address.");
  return json({ message: createChallenge(address) });
}

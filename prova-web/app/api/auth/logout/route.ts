import { endSession } from "@/lib/server/session";
import { json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST() {
  endSession();
  return json({ ok: true });
}

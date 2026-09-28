import { chainInfo } from "@/lib/server/chain";
import { json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return json(chainInfo());
}

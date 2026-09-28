import { currentUser } from "@/lib/server/session";
import { meView } from "@/lib/server/me";
import { json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return json({ me: await meView(await currentUser()) });
}

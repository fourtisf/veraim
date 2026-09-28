import { prisma } from "@/lib/db";
import { fail } from "@/lib/server/http";
import { currentUser, isAdmin } from "@/lib/server/session";

export const dynamic = "force-dynamic";

// CSV export of the waitlist (admins only).
export async function GET() {
  const user = await currentUser();
  if (!isAdmin(user?.wallet)) return fail("Admins only.", 403);
  const rows = await prisma.waitlist.findMany({ orderBy: { createdAt: "asc" } });
  const csv = ["email_or_wallet,source,created_at", ...rows.map((r) => `"${r.emailOrWallet.replace(/"/g, '""')}",${r.source || ""},${r.createdAt.toISOString()}`)].join("\n");
  return new Response(csv, { headers: { "content-type": "text/csv", "content-disposition": 'attachment; filename="veraim-waitlist.csv"' } });
}

import type { Metadata } from "next";
import AdminAgentToggle from "@/components/AdminAgentToggle";
import { prisma } from "@/lib/db";
import { currentUser, isAdmin } from "@/lib/server/session";
import { agentViews, siteStats } from "@/lib/server/views";
import { sealingEnabled } from "@/lib/server/chain";
import { modelAvailable } from "@/lib/server/llm";
import { telegramEnabled } from "@/lib/server/telegram";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin · Prova", robots: { index: false } };

export default async function AdminPage() {
  const user = await currentUser();
  if (!isAdmin(user?.wallet)) {
    return (
      <main className="page"><div className="wrap"><div className="page-head"><h1>Admins only</h1><p>Sign in with a wallet listed in ADMIN_WALLETS.</p></div></div></main>
    );
  }
  const [visible, hidden, waitlist, users, runs] = await Promise.all([
    agentViews({ hidden: false }),
    agentViews({ hidden: true }),
    prisma.waitlist.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.user.count(),
    prisma.run.count(),
  ]);
  const stats = await siteStats(visible);
  const checks: [string, boolean][] = [
    ["Onchain sealing (SEALER_PRIVATE_KEY + SEAL_CONTRACT)", sealingEnabled()],
    ["Claude models (ANTHROPIC_API_KEY)", modelAvailable("claude-sonnet")],
    ["Other models (OPENROUTER_API_KEY)", modelAvailable("gpt")],
    ["Telegram alerts (TELEGRAM_BOT_TOKEN + TELEGRAM_BOT_USERNAME)", telegramEnabled()],
    ["X mentions tool (X_BEARER_TOKEN)", !!process.env.X_BEARER_TOKEN],
    ["Waitlist emails (SMTP_URL + MAIL_FROM)", !!(process.env.SMTP_URL && process.env.MAIL_FROM)],
  ];

  return (
    <main className="page">
      <div className="wrap">
        <div className="page-head"><span className="kicker">Admin</span><h1>Overview</h1></div>
        <div className="stats" style={{ marginTop: 0 }}>
          <div><strong>{users}</strong><span>Wallets signed in</span></div>
          <div><strong>{runs}</strong><span>Runs</span></div>
          <div><strong>{stats.sealedCalls}</strong><span>Calls sealed</span></div>
          <div><strong>{stats.waitlistCount}</strong><span>Waitlist</span></div>
        </div>

        <div className="grid2" style={{ marginTop: 24 }}>
          <div className="panel">
            <h3 style={{ fontSize: 17, fontWeight: 500, marginBottom: 12 }}>Setup checks</h3>
            <table className="tbl"><tbody>
              {checks.map(([label, ok]) => <tr key={label}><td>{label}</td><td style={{ color: ok ? "var(--hit)" : "var(--amber)", textAlign: "right" }}>{ok ? "On" : "Off"}</td></tr>)}
            </tbody></table>
          </div>
          <div className="panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 17, fontWeight: 500 }}>Waitlist (latest 100)</h3>
              <a className="btn btn-g" style={{ height: 34 }} href="/api/admin/waitlist">Download CSV</a>
            </div>
            <table className="tbl"><tbody>
              {waitlist.map((w) => <tr key={w.id}><td className="mono">{w.emailOrWallet}</td><td style={{ color: "var(--t3)" }}>{w.source || ""}</td><td style={{ color: "var(--t3)" }}>{w.createdAt.toISOString().slice(0, 10)}</td></tr>)}
            </tbody></table>
          </div>
        </div>

        <div className="panel" style={{ marginTop: 16, maxWidth: "none" }}>
          <h3 style={{ fontSize: 17, fontWeight: 500, marginBottom: 12 }}>Agents</h3>
          <table className="tbl">
            <thead><tr><th>Agent</th><th>Creator</th><th>Graded</th><th>Record</th><th>Runs 7d</th><th /></tr></thead>
            <tbody>
              {[...visible, ...hidden].map((a) => (
                <tr key={a.id} style={hidden.includes(a) ? { opacity: 0.5 } : undefined}>
                  <td><a href={`/agents/${a.slug}`}>{a.name}</a></td>
                  <td className="mono">{a.official ? "Prova" : a.creator}</td>
                  <td>{a.graded}</td>
                  <td>{a.trackRecord ?? "—"}</td>
                  <td>{a.runs7d}</td>
                  <td style={{ textAlign: "right" }}><AdminAgentToggle id={a.id} hidden={hidden.includes(a)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

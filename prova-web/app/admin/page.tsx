import type { Metadata } from "next";
import AdminAgentToggle from "@/components/AdminAgentToggle";
import { prisma } from "@/lib/db";
import { currentUser, isAdmin } from "@/lib/server/session";
import { agentViews, siteStats } from "@/lib/server/views";
import { chainInfo, paymentsEnabled, publicClient, RUNS_ABI, sealingEnabled } from "@/lib/server/chain";
import { ENV } from "@/lib/server/env";
import { AUTOPILOT_WALLET } from "@/lib/server/system";
import TreasuryButtons from "@/components/TreasuryButtons";
import { money } from "@/lib/format";
import { modelAvailable } from "@/lib/server/llm";
import { telegramEnabled } from "@/lib/server/telegram";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin · Veraim", robots: { index: false } };

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
    prisma.user.count({ where: { wallet: { not: AUTOPILOT_WALLET } } }),
    prisma.run.count({ where: { user: { wallet: { not: AUTOPILOT_WALLET } } } }),
  ]);
  const stats = await siteStats(visible);
  const [paid, bought] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amountUsd: true, quantity: true } }),
    prisma.buyback.aggregate({ _sum: { amountUsd: true }, _count: true }),
  ]);
  let treasuryEth = 0, treasuryUsdg = 0;
  if (paymentsEnabled()) {
    try {
      const read = (asset: string) => publicClient().readContract({ address: ENV.runsContract as `0x${string}`, abi: RUNS_ABI, functionName: "treasuryBalance", args: [asset] }) as Promise<bigint>;
      const [e, u] = await Promise.all([read("0x0000000000000000000000000000000000000000"), read(ENV.usdg)]);
      treasuryEth = Number(e) / 1e18;
      treasuryUsdg = Number(u) / 1e6;
    } catch {}
  }
  const checks: [string, boolean][] = [
    ["Onchain sealing (SEALER_PRIVATE_KEY + SEAL_CONTRACT)", sealingEnabled()],
    ["Paid runs (RUNS_CONTRACT)", paymentsEnabled()],
    ["Buybacks (SWAP_ROUTER + WETH_ADDRESS)", !!(ENV.swapRouter && ENV.weth)],
    ["Claude models (ANTHROPIC_API_KEY or OPENROUTER_API_KEY)", modelAvailable("claude-sonnet")],
    ["Other models (OPENROUTER_API_KEY)", modelAvailable("gpt")],
    ["Telegram alerts (TELEGRAM_BOT_TOKEN + TELEGRAM_BOT_USERNAME)", telegramEnabled()],
    ["X mentions tool (X_BEARER_TOKEN)", !!process.env.X_BEARER_TOKEN],
    [`Autopilot, ${ENV.autopilotPerAgentPerDay} runs per official agent a day (AUTOPILOT_RUNS_PER_AGENT_PER_DAY)`, ENV.autopilotPerAgentPerDay > 0],
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

        <div className="panel" style={{ marginTop: 24, maxWidth: "none" }}>
          <h3 style={{ fontSize: 17, fontWeight: 500 }}>Money</h3>
          <p className="hint">
            Paid runs sold: {paid._sum.quantity || 0} ({money(paid._sum.amountUsd || 0)}). Bought back and burned: {money(bought._sum.amountUsd || 0)} in {bought._count} buyback{bought._count === 1 ? "" : "s"}.
            {" "}Treasury held in the contract: {treasuryEth.toFixed(6)} ETH and {treasuryUsdg.toFixed(2)} USDG.
          </p>
          {paymentsEnabled() && <TreasuryButtons chain={chainInfo()} eth={treasuryEth} usdg={treasuryUsdg} />}
        </div>

        <div className="grid2" style={{ marginTop: 16 }}>
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
                  <td className="mono">{a.official ? "Veraim" : a.creator}</td>
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

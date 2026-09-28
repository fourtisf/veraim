"use client";

import { record } from "@/lib/format";
import Avatar from "./Avatar";
import { useHome } from "./HomeData";
import { useUI } from "./UIProvider";

// "prova.live/leaderboard" app window in the hero, showing the real top agents.
export default function ProductWindow() {
  const { agents, stats } = useHome();
  const { me, openAgent } = useUI();
  const top = agents.slice(0, 6);
  return (
    <div className="win">
      <div className="win-bar"><i /><i /><i /><span className="url">prova.live/leaderboard</span></div>
      <div className="win-body">
        <div className="side">
          <div className="on">Leaderboard<small>{stats.agentCount.toLocaleString("en-US")}</small></div>
          <div>Fresh calls<small>{stats.calls24h}</small></div>
          <div>Watchlist<small>{me?.watch.length ?? 0}</small></div>
          <hr />
          <div>Sealed<small>{stats.sealedCalls}</small></div>
          <div>Pending<small>{stats.pending}</small></div>
          <div>Receipts</div>
        </div>
        <div className="main">
          <div className="mh"><b>Top agents this week</b><span>Updated live</span></div>
          <table className="mt">
            <thead>
              <tr><th>Agent</th><th className="h-tr">Track record</th><th className="h-runs">Graded</th><th className="h-spark">7d runs</th></tr>
            </thead>
            <tbody>
              {top.map((a) => (
                <tr key={a.id} onClick={() => openAgent(a.slug)} style={{ cursor: "pointer" }}>
                  <td><div className="mini"><Avatar a={a} /><span>{a.name}</span></div></td>
                  <td className="h-tr">
                    <span className="bar"><i style={{ width: `${a.ranked ? a.trackRecord : 0}%` }} /></span>
                    {a.ranked ? record(a.trackRecord) : <span style={{ color: "var(--t3)" }}>Unranked</span>}
                  </td>
                  <td className="h-runs" style={{ color: "var(--t2)" }}>{a.graded}</td>
                  <td className="h-spark" style={{ color: "var(--t2)" }}>{a.runs7d}</td>
                </tr>
              ))}
              {!top.length && <tr><td colSpan={4} style={{ color: "var(--t3)" }}>No agents yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

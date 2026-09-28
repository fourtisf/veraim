import { AGENTS, sparkPoints } from "@/lib/mock";
import Avatar from "./Avatar";

// Mock "prova.live/leaderboard" app window in the hero.
export default function ProductWindow() {
  const top = [...AGENTS].sort((x, y) => y.tr - x.tr).slice(0, 6);
  return (
    <div className="win">
      <div className="win-bar"><i /><i /><i /><span className="url">prova.live/leaderboard</span></div>
      <div className="win-body">
        <div className="side">
          <div className="on">Leaderboard<small>1,340</small></div>
          <div>Fresh calls<small>218</small></div>
          <div>Watchlist<small>6</small></div>
          <hr />
          <div>My agents<small>2</small></div>
          <div>Earnings<small>$412</small></div>
          <div>Receipts</div>
        </div>
        <div className="main">
          <div className="mh"><b>Top agents this week</b><span>Updated 14s ago</span></div>
          <table className="mt">
            <thead>
              <tr><th>Agent</th><th className="h-tr">Track record</th><th className="h-runs">Graded</th><th className="h-spark">7d runs</th></tr>
            </thead>
            <tbody>
              {top.map((a, i) => (
                <tr key={a.id}>
                  <td><div className="mini"><Avatar a={a} /><span>{a.n}</span></div></td>
                  <td className="h-tr"><span className="bar"><i style={{ width: `${a.tr}%` }} /></span>{a.tr}%</td>
                  <td className="h-runs" style={{ color: "var(--t2)" }}>{a.g}</td>
                  <td className="h-spark">
                    <svg className="spark" width="80" height="22" viewBox="0 0 80 22">
                      <polyline points={sparkPoints(i + 2)} fill="none" stroke="#E2CDA6" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" opacity=".85" />
                    </svg>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

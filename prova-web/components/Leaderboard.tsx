"use client";

import { useState } from "react";
import { AGENTS, CATS, dots, k } from "@/lib/mock";
import Avatar from "./Avatar";
import { useUI } from "./UIProvider";

type Sort = "tr" | "runs" | "mc" | "new";

export default function Leaderboard() {
  const { openAgent } = useUI();
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState<Sort>("tr");

  const list = AGENTS.filter((a) => cat === "All" || a.cat === cat).sort((x, y) =>
    sort === "tr" ? y.tr - x.tr : sort === "runs" ? y.runs - x.runs : sort === "mc" ? y.mc - x.mc : x.age - y.age
  );

  return (
    <section id="agents">
      <div className="wrap">
        <div className="head rv">
          <span className="kicker">Leaderboard</span>
          <h2>Agents, ranked by record</h2>
          <p>Open any agent to try it free, read its full call history, or buy its token.</p>
        </div>
        <div className="mbar">
          <div className="tabs" id="tabs">
            {CATS.map((c) => <button key={c} className={`tab ${c === cat ? "on" : ""}`} onClick={() => setCat(c)}>{c}</button>)}
          </div>
          <label className="sort">
            Sort by{" "}
            <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="tr">Track record</option>
              <option value="runs">Runs this week</option>
              <option value="mc">Market cap</option>
              <option value="new">Newest</option>
            </select>
          </label>
        </div>
        <div className="list rv spot" id="list">
          <div className="row hd"><span>#</span><span>Agent</span><span>Track record · last 12</span><span>Runs / 7d</span><span>Market cap</span><span>Bought back</span><span /></div>
          {!list.length && <div className="empty">No agents here yet. Be the first to build one.</div>}
          {list.map((a, i) => (
            <div
              key={a.id}
              className={`row ${i < 3 && sort === "tr" ? "top" : ""}`}
              tabIndex={0}
              role="button"
              aria-label={`Open ${a.n}`}
              onClick={() => openAgent(a.id)}
              onKeyDown={(e) => e.key === "Enter" && openAgent(a.id)}
            >
              <span className="rank">{String(i + 1).padStart(2, "0")}</span>
              <div className="ag"><Avatar a={a} /><div style={{ minWidth: 0 }}><b>{a.n}</b><span>{a.tag}</span></div></div>
              <div className="tr c-tr"><strong>{a.tr}%</strong><div className="dots">{dots(a).map((hit, j) => <i key={j} className={hit ? "" : "m"} />)}</div></div>
              <div className="num c-runs">{k(a.runs)}<small>{a.g} graded</small></div>
              <div className="num c-mc">${a.mc.toFixed(2)}M<small className={a.ch >= 0 ? "up" : "dn"}>{a.ch >= 0 ? "+" : ""}{a.ch}%</small></div>
              <div className="num c-rev">${k(a.bb)}<small>from usage</small></div>
              <span className="go">Try free</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

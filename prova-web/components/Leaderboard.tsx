"use client";

import { useState } from "react";
import { CATEGORIES, MIN_GRADED_TO_RANK } from "@/config/models";
import { k, record } from "@/lib/format";
import Avatar from "./Avatar";
import { useHome } from "./HomeData";
import { useUI } from "./UIProvider";

type Sort = "tr" | "runs" | "graded" | "new";
const CATS = ["All", ...CATEGORIES];

export default function Leaderboard() {
  const { agents } = useHome();
  const { openAgent } = useUI();
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState<Sort>("tr");

  const list = agents
    .filter((a) => cat === "All" || a.category === cat)
    .sort((x, y) =>
      sort === "tr" ? Number(y.ranked) - Number(x.ranked) || (y.ranked ? (y.trackRecord || 0) - (x.trackRecord || 0) : y.graded - x.graded)
      : sort === "runs" ? y.runs7d - x.runs7d
      : sort === "graded" ? y.graded - x.graded
      : y.createdAt.localeCompare(x.createdAt)
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
              <option value="graded">Graded calls</option>
              <option value="new">Newest</option>
            </select>
          </label>
        </div>
        <div className="list rv spot" id="list">
          <div className="row hd"><span>#</span><span>Agent</span><span>Track record · last 12</span><span>Runs / 7d</span><span>Market cap</span><span>Bought back</span><span /></div>
          {!list.length && <div className="empty">No agents here yet. Be the first to build one.</div>}
          {list.map((a, i) => {
            const dots = [...Array(Math.max(0, 12 - a.last12.length)).fill(null), ...a.last12];
            return (
              <div
                key={a.id}
                className={`row ${i < 3 && sort === "tr" && a.ranked ? "top" : ""}`}
                tabIndex={0}
                role="button"
                aria-label={`Open ${a.name}`}
                onClick={() => openAgent(a.slug)}
                onKeyDown={(e) => e.key === "Enter" && openAgent(a.slug)}
              >
                <span className="rank">{a.ranked ? String(i + 1).padStart(2, "0") : "—"}</span>
                <div className="ag"><Avatar a={a} /><div style={{ minWidth: 0 }}><b>{a.name}</b><span>{a.tagline}</span></div></div>
                <div className="tr c-tr">
                  <strong>{a.ranked ? record(a.trackRecord) : <small className="unr">{a.gradingMode === "none" ? "Not graded" : `${a.graded}/${MIN_GRADED_TO_RANK}`}</small>}</strong>
                  <div className="dots">{dots.map((d, j) => <i key={j} className={d === "hit" ? "" : d === "miss" ? "m" : "e"} />)}</div>
                </div>
                <div className="num c-runs">{k(a.runs7d)}<small>{a.graded} graded</small></div>
                <div className="num c-mc">—<small>Token soon</small></div>
                <div className="num c-rev">$0<small>from usage</small></div>
                <span className="go">Try free</span>
              </div>
            );
          })}
        </div>
        <p className="hint" style={{ marginTop: 14 }}>Agents rank after {MIN_GRADED_TO_RANK} graded calls. Until then they show how many they have.</p>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { pad, shortHash } from "@/lib/format";
import type { CallView } from "@/lib/types";
import { SITE } from "@/config/site";
import Avatar from "./Avatar";
import { Status } from "./AgentPanel";
import { useHome } from "./HomeData";
import { useUI } from "./UIProvider";

type Filter = "all" | "open" | "graded";
const FILTERS: [Filter, string][] = [["all", "All"], ["open", "Pending"], ["graded", "Graded"]];

function Row({ c, onOpen }: { c: CallView; onOpen: () => void }) {
  return (
    <div className="fi" onClick={onOpen} style={{ cursor: "pointer" }}>
      <Avatar a={c.agent} />
      <div style={{ minWidth: 0 }}><b>{c.agent.name}</b><p>{c.subject ? shortHash(c.subject) + " · " : ""}{c.label}</p></div>
      <div className="fi-r">
        <Status c={c.status} gradesAt={c.gradesAt} />
        <small>{c.sealUrl ? <a href={c.sealUrl} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>{shortHash(c.claimHash!)}</a> : "sealing…"}</small>
      </div>
    </div>
  );
}

export default function LiveFeed() {
  const home = useHome();
  const { openAgent } = useUI();
  const [filter, setFilter] = useState<Filter>("all");
  const [filtered, setFiltered] = useState<CallView[] | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Pending/Graded tabs ask the server; "All" uses the live list the page already polls.
  useEffect(() => {
    if (filter === "all") return setFiltered(null);
    let stop = false;
    const load = () => api<{ calls: CallView[] }>(`/api/calls?filter=${filter}`).then((r) => !stop && setFiltered(r.calls)).catch(() => {});
    load();
    const id = setInterval(load, 10_000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [filter]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { stats, nextGradeAt } = home;
  const rows = (filtered ?? home.calls).slice(0, 8);
  const hit = stats.hitRate24h;
  const growth = stats.sealedYesterday ? Math.round(((stats.sealedToday - stats.sealedYesterday) / stats.sealedYesterday) * 100) : null;
  const left = nextGradeAt ? Math.max(0, Math.floor((new Date(nextGradeAt).getTime() - now) / 1000)) : null;
  const countdown = left === null ? null : left >= 3600 ? `${Math.floor(left / 3600)}h ${pad(Math.floor((left % 3600) / 60))}m` : `${pad(Math.floor(left / 60))}:${pad(left % 60)}`;

  return (
    <section id="live">
      <div className="wrap">
        <div className="head rv">
          <span className="kicker">Live</span>
          <h2>Calls, sealed as they happen.</h2>
          <p>Every verdict lands here the second it&apos;s made, with its onchain seal. Nothing can be edited after the fact.</p>
        </div>
        <div className="live-wrap">
          <div className="feed rv spot">
            <div className="feed-h">
              <span className="pulse" />Streaming from {SITE.chain}
              <div className="tabs" id="ftabs">
                {FILTERS.map(([f, label]) => <button key={f} className={`tab ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>{label}</button>)}
              </div>
            </div>
            <div className="feed-body" id="feed" key={filter}>
              {rows.map((c) => <Row key={c.id} c={c} onOpen={() => openAgent(c.agent.slug)} />)}
              {!rows.length && (
                <div className="empty">{filter === "all" ? "No sealed calls yet. Open any agent and run it: its call lands here the second it's sealed." : "Nothing here yet."}</div>
              )}
            </div>
          </div>
          <div className="kpis">
            <div className="kpi rv spot">
              <small>Sealed today</small>
              <strong>{stats.sealedToday.toLocaleString("en-US")}</strong>
              <em style={growth === null ? { color: "var(--t3)" } : growth < 0 ? { color: "var(--miss)" } : undefined}>
                {growth === null ? "UTC day" : `${growth >= 0 ? "+" : ""}${growth}% vs yesterday`}
              </em>
            </div>
            <div className="kpi rv spot">
              <small>Network hit rate, 24h</small>
              <div className="ringw">
                <svg width="64" height="64" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="27" fill="none" stroke="#1C1C20" strokeWidth="5" />
                  {hit !== null && <circle cx="32" cy="32" r="27" fill="none" stroke="url(#rg)" strokeWidth="5" strokeLinecap="round" strokeDasharray="169.6" strokeDashoffset={169.6 * (1 - hit / 100)} transform="rotate(-90 32 32)" />}
                  <defs><linearGradient id="rg"><stop offset="0" stopColor="#BFA57A" /><stop offset="1" stopColor="#F4E6CC" /></linearGradient></defs>
                </svg>
                <strong>{hit === null ? "—" : `${hit}%`}</strong>
              </div>
            </div>
            <div className="kpi rv spot">
              <small>Waiting to be graded</small>
              <strong>{stats.pending.toLocaleString("en-US")}</strong>
              <em style={{ color: "var(--t3)" }} suppressHydrationWarning>{countdown ? `Next grade in ${countdown}` : "Nothing waiting"}</em>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

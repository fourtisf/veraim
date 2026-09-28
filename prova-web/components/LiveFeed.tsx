"use client";

import { useEffect, useState } from "react";
import { FEED_START, newFeedItem, seeded, type FeedItem } from "@/lib/mock";
import Avatar from "./Avatar";

type Filter = "all" | "open" | "graded";
const FILTERS: [Filter, string][] = [["all", "All"], ["open", "Pending"], ["graded", "Graded"]];
const matches = (f: FeedItem, filter: Filter) => filter === "all" || (filter === "open" ? f.st === "open" : f.st !== "open");
const pad = (n: number) => String(n).padStart(2, "0");

function Row({ f }: { f: FeedItem }) {
  return (
    <div className="fi">
      <Avatar a={f.a} />
      <div style={{ minWidth: 0 }}><b>{f.a.n}</b><p>{f.claim}</p></div>
      <div className="fi-r">
        {f.st === "open"
          ? <span className="st open">Grades in {f.h}h {pad(f.m)}m</span>
          : <span className={`st ${f.st}`}>{f.st === "hit" ? "Hit" : "Miss"}</span>}
        <small>{f.hash}</small>
      </div>
    </div>
  );
}

export default function LiveFeed() {
  const [items, setItems] = useState<FeedItem[]>(() => {
    const r = seeded(42);
    return Array.from({ length: 12 }, () => newFeedItem(r));
  });
  const [filter, setFilter] = useState<Filter>("all");
  const [sealed, setSealed] = useState(FEED_START.sealed);
  const [pending, setPending] = useState(FEED_START.pending);
  const [next, setNext] = useState(FEED_START.nextBatchSeconds);

  // A new sealed call every 3.2s.
  useEffect(() => {
    const id = setInterval(() => {
      const f = newFeedItem();
      setItems((list) => [f, ...list].slice(0, 40));
      setSealed((n) => n + 1);
      if (f.st === "open") setPending((n) => n + 1);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  // "Next batch in mm:ss" countdown, restarting at 5 minutes.
  useEffect(() => {
    const id = setInterval(() => setNext((s) => (s > 0 ? s - 1 : 300)), 1000);
    return () => clearInterval(id);
  }, []);

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
              <span className="pulse" />Streaming from Robinhood Chain
              <div className="tabs" id="ftabs">
                {FILTERS.map(([f, label]) => <button key={f} className={`tab ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>{label}</button>)}
              </div>
            </div>
            {/* keyed by filter so rows re-animate when switching tabs, like the prototype */}
            <div className="feed-body" id="feed" key={filter}>
              {items.filter((f) => matches(f, filter)).slice(0, 8).map((f) => <Row key={f.id} f={f} />)}
            </div>
          </div>
          <div className="kpis">
            <div className="kpi rv spot"><small>Sealed today</small><strong>{sealed.toLocaleString("en-US")}</strong><em>+18% vs yesterday</em></div>
            <div className="kpi rv spot">
              <small>Network hit rate, 24h</small>
              <div className="ringw">
                <svg width="64" height="64" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="27" fill="none" stroke="#1C1C20" strokeWidth="5" />
                  <circle cx="32" cy="32" r="27" fill="none" stroke="url(#rg)" strokeWidth="5" strokeLinecap="round" strokeDasharray="169.6" strokeDashoffset="49.2" transform="rotate(-90 32 32)" />
                  <defs><linearGradient id="rg"><stop offset="0" stopColor="#BFA57A" /><stop offset="1" stopColor="#F4E6CC" /></linearGradient></defs>
                </svg>
                <strong>71%</strong>
              </div>
            </div>
            <div className="kpi rv spot"><small>Waiting to be graded</small><strong>{pending.toLocaleString("en-US")}</strong><em style={{ color: "var(--t3)" }}>Next batch in {pad(Math.floor(next / 60))}:{pad(next % 60)}</em></div>
          </div>
        </div>
      </div>
    </section>
  );
}

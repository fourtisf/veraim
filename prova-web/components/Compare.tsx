"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { k, money, record } from "@/lib/format";
import LineChart from "./LineChart";
import { useHome } from "./HomeData";

const B_COLOR = "#9AA4FF";

export default function Compare() {
  const { agents } = useHome();
  const [aSlug, setA] = useState(agents[0]?.slug || "");
  const [bSlug, setB] = useState(agents[1]?.slug || agents[0]?.slug || "");
  const [series, setSeries] = useState<Record<string, (number | null)[]>>({});

  useEffect(() => {
    for (const s of [aSlug, bSlug]) {
      if (!s || series[s]) continue;
      api<{ series: (number | null)[] }>(`/api/agents/${s}`).then((r) => setSeries((m) => ({ ...m, [s]: r.series }))).catch(() => {});
    }
  }, [aSlug, bSlug, series]);

  const A = agents.find((x) => x.slug === aSlug);
  const B = agents.find((x) => x.slug === bSlug);
  if (!A || !B) return null;

  const tokenRows = !(A.official && B.official); // official agents are plain AI: no token, buybacks or age
  const metrics: [string, number, number, (v: number) => string][] = [
    ["Track record", A.trackRecord ?? 0, B.trackRecord ?? 0, (v) => (v ? `${Math.round(v)}%` : "—")],
    ["Graded calls", A.graded, B.graded, String],
    ["Calls / 7d", A.calls7d, B.calls7d, k],
    ["Hits", A.hits, B.hits, String],
    ...(tokenRows ? ([
      ["Bought back", A.boughtBackUsd, B.boughtBackUsd, money],
      ["Market cap", A.marketCapUsd ?? 0, B.marketCapUsd ?? 0, (v) => (v ? money(v) : "—")],
      ["Days live", A.ageDays, B.ageDays, String],
    ] as [string, number, number, (v: number) => string][]) : []),
  ];
  const both = A.trackRecord !== null && B.trackRecord !== null;
  const d = both ? Math.round(A.trackRecord! - B.trackRecord!) : 0;
  const hasChart = [series[A.slug], series[B.slug]].some((s) => s?.some((v) => v !== null));

  const select = (value: string, set: (v: string) => void, label: string, color: string) => (
    <div className="csel">
      <span className="sw8" style={{ background: color }} />
      <select value={value} onChange={(e) => set(e.target.value)} aria-label={label}>
        {agents.map((a) => <option key={a.id} value={a.slug}>{a.name}</option>)}
      </select>
    </div>
  );

  return (
    <section id="compare">
      <div className="wrap">
        <div className="head rv">
          <span className="kicker">Compare</span>
          <h2>Put two agents head to head.</h2>
          <p>Same data, side by side. Pick any two and see who&apos;s actually better.</p>
        </div>
        <div className="cmp rv spot">
          <div className="cmp-sel">
            {select(aSlug, setA, "First agent", "var(--gold)")}
            <span className="vsb">VS</span>
            {select(bSlug, setB, "Second agent", B_COLOR)}
          </div>
          <div className="cmp-body">
            <div className="chartbox">
              <div className="lg">
                <span><i style={{ background: "var(--gold)" }} />{A.name}</span>
                <span><i style={{ background: B_COLOR }} />{B.name}</span>
                <span style={{ marginLeft: "auto", color: "var(--t3)" }}>Track record · 30 days</span>
              </div>
              {hasChart ? (
                <LineChart id="cmp" list={[{ d: series[A.slug] || [], c: "#E2CDA6", fill: true }, { d: series[B.slug] || [], c: B_COLOR }]} />
              ) : (
                <div className="empty" style={{ padding: "70px 12px" }}>No graded calls yet for these two. The chart fills in as calls are graded.</div>
              )}
            </div>
            <div>
              <div>
                {metrics.map(([label, x, y, f]) => {
                  const mx = Math.max(x, y) || 1, wa = x >= y && x > 0, wb = y >= x && y > 0;
                  return (
                    <div className="mrow" key={label}>
                      <div className="a">
                        <span className={wa ? "win-v" : "lose-v"}>{f(x)}</span>
                        <span className="hb"><i className={wa ? "w" : ""} style={{ width: `${(x / mx) * 100}%` }} /></span>
                      </div>
                      <div className="lab">{label}</div>
                      <div className="b">
                        <span className="hb"><i className={wb ? "w" : ""} style={{ width: `${(y / mx) * 100}%` }} /></span>
                        <span className={wb ? "win-v" : "lose-v"}>{f(y)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="verdict">
                {A.id === B.id ? "Pick two different agents to compare."
                  : !both ? "Not enough graded calls yet to call a winner. Records fill in as calls are graded."
                  : d === 0 ? "Dead even on track record. Look at volume and graded calls."
                  : <><b>{d > 0 ? A.name : B.name}</b> has been right {Math.abs(d)} points more often across graded calls{!(A.ranked && B.ranked) && " (not both ranked yet)"}.</>}
                {" "}<span style={{ color: "var(--t3)" }}>Records: {record(A.trackRecord)} vs {record(B.trackRecord)}.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

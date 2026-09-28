"use client";

import { useState } from "react";
import { AGENTS, k, series } from "@/lib/mock";
import LineChart from "./LineChart";

const B_COLOR = "#9AA4FF";

export default function Compare() {
  const [aId, setA] = useState("hound");
  const [bId, setB] = useState("tide");
  const A = AGENTS.find((x) => x.id === aId)!;
  const B = AGENTS.find((x) => x.id === bId)!;

  const metrics: [string, number, number, (v: number) => string][] = [
    ["Track record", A.tr, B.tr, (v) => v + "%"],
    ["Graded calls", A.g, B.g, String],
    ["Runs / 7d", A.runs, B.runs, k],
    ["Bought back", A.bb, B.bb, (v) => "$" + k(v)],
    ["Market cap", A.mc, B.mc, (v) => "$" + v.toFixed(2) + "M"],
    ["Days live", A.age, B.age, String],
  ];
  const d = A.tr - B.tr;

  const select = (value: string, set: (v: string) => void, label: string, color: string) => (
    <div className="csel">
      <span className="sw8" style={{ background: color }} />
      <select value={value} onChange={(e) => set(e.target.value)} aria-label={label}>
        {AGENTS.map((a) => <option key={a.id} value={a.id}>{a.n}</option>)}
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
            {select(aId, setA, "First agent", "var(--gold)")}
            <span className="vsb">VS</span>
            {select(bId, setB, "Second agent", B_COLOR)}
          </div>
          <div className="cmp-body">
            <div className="chartbox">
              <div className="lg">
                <span><i style={{ background: "var(--gold)" }} />{A.n}</span>
                <span><i style={{ background: B_COLOR }} />{B.n}</span>
                <span style={{ marginLeft: "auto", color: "var(--t3)" }}>Track record · 30 days</span>
              </div>
              <LineChart id="cmp" list={[{ d: series(A), c: "#E2CDA6", fill: true }, { d: series(B), c: B_COLOR }]} />
            </div>
            <div>
              <div>
                {metrics.map(([label, x, y, f]) => {
                  const mx = Math.max(x, y) || 1, wa = x >= y, wb = y >= x;
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
                  : d === 0 ? "Dead even on track record. Look at volume and buybacks."
                  : <><b>{d > 0 ? A.n : B.n}</b> has been right {Math.abs(d)} points more often across graded calls.</>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

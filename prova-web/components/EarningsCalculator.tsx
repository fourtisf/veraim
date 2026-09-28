"use client";

import { useState, type CSSProperties } from "react";
import { money } from "@/lib/format";

const PRICES = ["0.02", "0.05", "0.10", "0.25"];

export default function EarningsCalculator() {
  const [r, setR] = useState(60); // slider positions, 0–100
  const [v, setV] = useState(50);
  const [price, setPrice] = useState("0.05");

  // Sliders are logarithmic: 10–10,000 runs a day, $1K–$500K volume a day.
  const runs = Math.round(10 * Math.pow(1000, r / 100));
  const vol = Math.round(1000 * Math.pow(500, v / 100));
  const p = +price;
  const rr = runs * p * 30, fromRuns = rr * 0.6, fromVol = vol * 0.005 * 30, bb = rr * 0.3, total = fromRuns + fromVol;

  return (
    <div className="calc rv spot">
      <div className="calc-in">
        <h3>Earnings calculator</h3>
        <div className="rl"><span>Paid runs per day</span><b>{runs.toLocaleString("en-US")}</b></div>
        <input type="range" min={0} max={100} value={r} onChange={(e) => setR(+e.target.value)} aria-label="Paid runs per day" style={{ "--p": r + "%" } as CSSProperties} />
        <div className="rl"><span>Price per run</span><b>${p.toFixed(2)}</b></div>
        <div className="seg" id="sPrice">
          {PRICES.map((x) => (
            <label key={x}><input type="radio" name="pp" value={x} checked={price === x} onChange={() => setPrice(x)} />${x}</label>
          ))}
        </div>
        <div className="rl"><span>Token trading volume per day</span><b>{money(vol)}</b></div>
        <input type="range" min={0} max={100} value={v} onChange={(e) => setV(+e.target.value)} aria-label="Token trading volume per day" style={{ "--p": v + "%" } as CSSProperties} />
        <p className="hint" style={{ marginTop: 18 }}>Creators receive 60% of paid runs and 0.5% of their token&apos;s trading volume.</p>
      </div>
      <div className="calc-out">
        <h3>You&apos;d earn per month</h3>
        <div className="big">{money(total)}</div>
        <div className="big-sub">{money(total * 12)} a year at this pace</div>
        <div className="orow"><span>From paid runs</span><b>{money(fromRuns)}</b></div>
        <div className="orow"><span>From trading fees</span><b>{money(fromVol)}</b></div>
        <div className="orow hl"><span>Token bought back and burned</span><b>{money(bb)} / mo</b></div>
      </div>
    </div>
  );
}

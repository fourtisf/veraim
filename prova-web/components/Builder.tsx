"use client";

import { useState } from "react";
import { useUI } from "./UIProvider";

const STEPS = ["Identity", "Instructions", "Tools", "Launch"];
const CATEGORIES = ["Security", "Trading calls", "Research", "Social"];
const MODELS = ["Claude Sonnet", "GPT class", "Llama 70B (cheapest)", "DeepSeek"];
const GRADING = ["Verdict vs 24h outcome", "Price call vs 7d price", "Not graded"];
const PRICES = ["$0.02", "$0.05", "$0.10", "$0.25"];
const TOOLS: [string, string][] = [
  ["Holder map", "Top holders and linked wallets"],
  ["Bundle scan", "First-block buys and funding"],
  ["Whale flow", "Large buys and sells live"],
  ["Dev history", "Deployer's past launches"],
  ["Price feed", "Price, volume, liquidity"],
  ["X mentions", "Who's posting about it"],
];

function Seg({ name, options, value, onChange }: { name: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <label key={o}><input type="radio" name={name} value={o} checked={value === o} onChange={() => onChange(o)} />{o}</label>
      ))}
    </div>
  );
}

export default function Builder() {
  const { openWaitlist } = useUI();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    name: "Bundle Hound",
    tag: "Sniffs out bundled launches before you buy",
    cat: "Security",
    prompt: "Given a token address, check holder distribution and funding wallets. Flag if more than 20% of supply was bought in the first block by linked wallets. Give a verdict: SAFE, CAUTION or BUNDLED, with one line of reasoning.",
    model: MODELS[0],
    grade: GRADING[0],
    tools: ["Holder map", "Bundle scan"],
    ticker: "HOUND",
    price: "$0.05",
    buy: "0.05 ETH",
  });
  const set = (key: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [key]: v }));
  const input = (key: keyof typeof f) => ({ value: f[key] as string, onChange: (e: { target: { value: string } }) => set(key)(e.target.value) });
  const toggleTool = (t: string) =>
    setF((s) => ({ ...s, tools: s.tools.includes(t) ? s.tools.filter((x) => x !== t) : TOOLS.map(([n]) => n).filter((n) => n === t || s.tools.includes(n)) }));

  const name = f.name || "Your agent";
  const ticker = (f.ticker || "TICKER").toUpperCase();
  const last = step === STEPS.length - 1;

  return (
    <section id="build">
      <div className="wrap">
        <div className="head rv">
          <span className="kicker">Build</span>
          <h2>Launch an agent in four steps.</h2>
          <p>No code. Your agent&apos;s card updates on the right as you go.</p>
        </div>
        <div className="builder">
          <div className="panel rv spot">
            <div className="steps" id="steps">
              {STEPS.map((s, i) => (
                <button key={s} className={i === step ? "on" : i < step ? "done" : ""} onClick={() => setStep(i)}>{s}</button>
              ))}
            </div>

            <div className={`step ${step === 0 ? "on" : ""}`}>
              <h3>Who is your agent?</h3><p>A name people remember and a category buyers search for.</p>
              <label className="f" htmlFor="bName">Agent name</label><input className="t" id="bName" maxLength={24} {...input("name")} />
              <label className="f" htmlFor="bTag">One-line description</label><input className="t" id="bTag" maxLength={60} {...input("tag")} />
              <label className="f">Category</label>
              <Seg name="cat" options={CATEGORIES} value={f.cat} onChange={set("cat")} />
            </div>

            <div className={`step ${step === 1 ? "on" : ""}`}>
              <h3>What does it do?</h3><p>Brief it like a sharp analyst on day one.</p>
              <label className="f" htmlFor="bPrompt">Instructions</label>
              <textarea className="t" id="bPrompt" {...input("prompt")} />
              <label className="f" htmlFor="bModel">Model</label>
              <select className="t" id="bModel" {...input("model")}>{MODELS.map((m) => <option key={m}>{m}</option>)}</select>
              <label className="f">What gets graded</label>
              <Seg name="grade" options={GRADING} value={f.grade} onChange={set("grade")} />
              <p className="hint">Ungraded agents can launch but won&apos;t appear on the leaderboard.</p>
            </div>

            <div className={`step ${step === 2 ? "on" : ""}`}>
              <h3>Give it tools</h3><p>Live data your agent pulls on every run.</p>
              <div className="tools" id="bTools">
                {TOOLS.map(([t, d]) => (
                  <label className="tool" key={t}>
                    <input type="checkbox" value={t} checked={f.tools.includes(t)} onChange={() => toggleTool(t)} />
                    <div><b>{t}</b><span>{d}</span></div>
                  </label>
                ))}
              </div>
            </div>

            <div className={`step ${step === 3 ? "on" : ""}`}>
              <h3>Launch its token</h3><p>You earn from trading and from every paid run.</p>
              <div className="split">
                <div><label className="f" htmlFor="bTicker">Ticker</label><input className="t" id="bTicker" maxLength={8} {...input("ticker")} /></div>
                <div><label className="f" htmlFor="bPrice">Price per paid run</label><select className="t" id="bPrice" {...input("price")}>{PRICES.map((p) => <option key={p}>{p}</option>)}</select></div>
              </div>
              <label className="f" htmlFor="bBuy">Your opening buy (optional)</label><input className="t" id="bBuy" {...input("buy")} />
              <p className="hint">Launch fee 0.002 ETH. Liquidity locks when the token graduates.</p>
            </div>

            <div className="nav-steps">
              <button className="btn btn-g" style={{ visibility: step ? "visible" : "hidden" }} onClick={() => setStep(step - 1)}>Back</button>
              <button className={`btn ${last ? "btn-gold" : "btn-w"}`} onClick={() => (last ? openWaitlist("launch", f.name || "Agent") : setStep(step + 1))}>
                {last ? "Launch agent" : "Continue"}
              </button>
            </div>
          </div>

          <div className="sticky">
            <div className="pcard rv">
              <div className="pc-top"><div className="av">{name[0] || "A"}</div><div><b>{name}</b><span>${ticker} · {f.cat}</span></div></div>
              <p className="pc-tag">{f.tag || "What your agent does, in one line."}</p>
              <div className="pc-chips">{f.tools.length ? f.tools.map((t) => <i key={t}>{t}</i>) : <i>No tools yet</i>}</div>
              <div className="kv"><span>Model</span><b>{f.model}</b></div>
              <div className="kv"><span>Graded on</span><b>{f.grade}</b></div>
              <div className="kv"><span>Price per run</span><b>{f.price} after 5 free</b></div>
              <div className="pc-score">
                <div><span>Track record</span><div style={{ fontSize: 12, color: "var(--t3)" }}>Starts with the first graded call</div></div>
                <strong>—</strong>
              </div>
            </div>
            <p className="pc-note">This is how your agent appears to buyers.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

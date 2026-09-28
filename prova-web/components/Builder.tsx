"use client";

import { useState } from "react";
import { CATEGORIES, GRADING_OPTIONS, MODEL_OPTIONS, PRICE_OPTIONS, TOOL_OPTIONS as TOOLS, modelLabel } from "@/config/models";
import { api } from "@/lib/client";
import { useUI } from "./UIProvider";

const STEPS = ["Identity", "Instructions", "Tools", "Launch"];
const GRADING = GRADING_OPTIONS.map((g) => g.label);
const PRICES = PRICE_OPTIONS.map((p) => "$" + p.toFixed(2));

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
  const { requireWallet, toast, openAgent, bumpData } = useUI();
  const [step, setStep] = useState(0);
  const [launching, setLaunching] = useState(false);
  const [f, setF] = useState({
    name: "Bundle Hound",
    tag: "Sniffs out bundled launches before you buy",
    cat: "Security",
    prompt: "Given a token address, check holder distribution and funding wallets. Flag if more than 20% of supply was bought in the first block by linked wallets. Give a verdict: SAFE, CAUTION or BUNDLED, with one line of reasoning.",
    model: MODEL_OPTIONS[0].key,
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

  // Creates the agent for the signed-in wallet. It goes live right away; its token launches later.
  const launch = async () => {
    if (launching || !(await requireWallet())) return;
    setLaunching(true);
    try {
      const { slug } = await api<{ slug: string }>("/api/agents", {
        body: {
          name: f.name,
          tagline: f.tag,
          category: f.cat,
          instructions: f.prompt,
          model: f.model,
          gradingMode: GRADING_OPTIONS.find((g) => g.label === f.grade)?.key,
          tools: f.tools,
          ticker: f.ticker,
          price: +f.price.slice(1),
          openingBuy: f.buy,
        },
      });
      toast(`${f.name} is live. Try its first run`);
      bumpData();
      openAgent(slug);
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setLaunching(false);
    }
  };

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
              <select className="t" id="bModel" {...input("model")}>{MODEL_OPTIONS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</select>
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
              <p className="hint">Your agent goes live as soon as you launch. Its token launches on Robinfun when that opens (fee 0.002 ETH, liquidity locks when the token graduates).</p>
            </div>

            <div className="nav-steps">
              <button className="btn btn-g" style={{ visibility: step ? "visible" : "hidden" }} onClick={() => setStep(step - 1)}>Back</button>
              <button className={`btn ${last ? "btn-gold" : "btn-w"}`} disabled={launching} onClick={() => (last ? launch() : setStep(step + 1))}>
                {last ? (launching ? "Launching…" : "Launch agent") : "Continue"}
              </button>
            </div>
          </div>

          <div className="sticky">
            <div className="pcard rv">
              <div className="pc-top"><div className="av">{name[0] || "A"}</div><div><b>{name}</b><span>${ticker} · {f.cat}</span></div></div>
              <p className="pc-tag">{f.tag || "What your agent does, in one line."}</p>
              <div className="pc-chips">{f.tools.length ? f.tools.map((t) => <i key={t}>{t}</i>) : <i>No tools yet</i>}</div>
              <div className="kv"><span>Model</span><b>{modelLabel(f.model)}</b></div>
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

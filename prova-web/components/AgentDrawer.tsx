"use client";

import { useEffect, useRef, useState } from "react";
import { AGENTS, k, series, type Agent, type CallStatus } from "@/lib/mock";
import { SITE } from "@/config/site";
import Avatar from "./Avatar";
import LineChart from "./LineChart";
import { useUI } from "./UIProvider";

const TABS: [string, string][] = [["try", "Try it"], ["perf", "Performance"], ["rec", "Receipts"], ["tok", "Token"]];
const FREE_RUNS = 5;

type Msg = { u: boolean; text: string; claim?: string };

function Status({ c }: { c: CallStatus }) {
  return <span className={`st ${c}`}>{c === "open" ? "Pending" : c === "hit" ? "Hit" : "Miss"}</span>;
}

export default function AgentDrawer({ agentId, open, session, onClose }: { agentId: string | null; open: boolean; session: number; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const a = AGENTS.find((x) => x.id === agentId);

  // While closed the drawer sits off-screen: keep it out of the Tab order.
  useEffect(() => {
    if (drawerRef.current) drawerRef.current.inert = !open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => closeRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, [open, session]);

  return (
    <>
      <div className={`scrim ${open ? "on" : ""}`} onClick={onClose} />
      <aside
        ref={drawerRef}
        className={`drawer ${open ? "on" : ""}`}
        aria-hidden={!open}
        role="dialog"
        aria-label="Agent details"
      >
        <button className="dx" ref={closeRef} onClick={onClose} aria-label="Close">✕</button>
        {/* keyed so each open starts fresh, like the prototype re-rendering the drawer */}
        {a && <DrawerBody key={session} a={a} />}
      </aside>
    </>
  );
}

function DrawerBody({ a }: { a: Agent }) {
  const { toast, watch, alerts, toggleWatch, toggleAlert } = useUI();
  const [tab, setTab] = useState("try");
  const [msgs, setMsgs] = useState<Msg[]>([{ u: false, text: `${a.tag}. Ask me anything. Every verdict I give is sealed onchain.` }]);
  const [pending, setPending] = useState(0); // runs waiting for a reply
  const [freeLeft, setFreeLeft] = useState(FREE_RUNS);
  const [q, setQ] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    const c = chatRef.current;
    if (c) c.scrollTop = c.scrollHeight;
  }, [msgs, pending]);

  const run = (text: string) => {
    text = text.trim();
    if (!text) return;
    if (freeLeft <= 0) {
      toast("Free runs used. Connect a wallet to keep going");
      return;
    }
    setFreeLeft((n) => n - 1);
    setQ("");
    setMsgs((m) => [...m, { u: true, text }]);
    setPending((n) => n + 1);
    timers.current.push(setTimeout(() => {
      setPending((n) => n - 1);
      setMsgs((m) => [...m, { u: false, text: a.reply.text, claim: a.reply.claim }]);
    }, 1200));
  };

  const replies = msgs.filter((m) => !m.u).length - 1; // runs answered so far
  const shownLeft = FREE_RUNS - replies;
  const freeText = shownLeft ? `${shownLeft} free run${shownLeft > 1 ? "s" : ""} left, then $0.05 per run` : "Free runs used. Next run costs $0.05";

  const alertOn = alerts.has(a.id);
  const starOn = watch.has(a.id);

  return (
    <div>
      <div className="d-top">
        <Avatar a={a} />
        <div>
          <h3>{a.n}</h3>
          <span>${a.t} · {a.cat} · live {a.age} days</span>
        </div>
      </div>
      <div className="d-stats">
        <div><small>Track record</small><b className="g">{a.tr}%</b></div>
        <div><small>Graded calls</small><b>{a.g}</b></div>
        <div><small>Bought back</small><b>${k(a.bb)}</b></div>
      </div>
      <div className="d-actions">
        <button
          className={`swt ${alertOn ? "on" : ""}`}
          aria-pressed={alertOn}
          onClick={() => toast(toggleAlert(a.id) ? `Alerts on. Every new ${a.n} call goes to Telegram` : "Alerts off")}
        >
          Telegram alert on every new call<i />
        </button>
        <button
          className={`star ${starOn ? "on" : ""}`}
          aria-label="Add to watchlist"
          aria-pressed={starOn}
          onClick={() => toast(toggleWatch(a.id) ? `${a.n} added to watchlist` : "Removed from watchlist")}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill={starOn ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
            <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
          </svg>
        </button>
      </div>
      <div className="dtabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      <div className={`dpane ${tab === "try" ? "on" : ""}`}>
        <div className="chat" ref={chatRef}>
          {msgs.map((m, i) => (
            <div key={i} className={`msg ${m.u ? "u" : "a"}`}>
              {m.text}
              {m.claim && <div className="claim">{m.claim}</div>}
            </div>
          ))}
          {pending > 0 && <div className="typing">Pulling live data…</div>}
        </div>
        <div className="chips">
          {a.ask.map((s) => <button key={s} onClick={() => run(s)}>{s}</button>)}
        </div>
        <div className="ask">
          <input className="t" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run(q)} placeholder={`Ask ${a.n}…`} aria-label={`Ask ${a.n}`} />
          <button className="btn btn-w" onClick={() => run(q)}>Run</button>
        </div>
        <p className="free">{freeText}</p>
      </div>

      <div className={`dpane ${tab === "rec" ? "on" : ""}`}>
        <div className="rec">
          {a.calls.concat(a.calls).map((c, i) => (
            <div key={i}>
              <div><b>{c[0]}</b><small>{c[1]} · {c[3]} ago</small></div>
              <Status c={c[2]} />
            </div>
          ))}
        </div>
        <p className="free">Each call is sealed onchain before the result is known, so it can&apos;t be edited or deleted.</p>
      </div>

      <div className={`dpane ${tab === "perf" ? "on" : ""}`}>
        <div className="chartbox">
          <div className="lg">
            <span><i style={{ background: "var(--gold)" }} />Track record</span>
            <span style={{ marginLeft: "auto", color: "var(--t3)" }}>Last 30 days</span>
          </div>
          <LineChart id="perf" list={[{ d: series(a), c: "#E2CDA6", fill: true }]} w={480} h={170} />
        </div>
        <div className="pstats">
          <div><small>Best streak</small><b>{Math.round(a.tr / 7)} hits</b></div>
          <div><small>Avg time to grade</small><b>{a.cat === "Trading calls" ? "6.2d" : "24h"}</b></div>
          <div><small>Calls this week</small><b>{Math.round(a.g / 5)}</b></div>
        </div>
      </div>

      <div className={`dpane ${tab === "tok" ? "on" : ""}`}>
        <div className="tok">
          <div className="kv"><span>Market cap</span><b>${a.mc.toFixed(2)}M</b></div>
          <div className="kv"><span>24h change</span><b className={a.ch >= 0 ? "up" : "dn"}>{a.ch >= 0 ? "+" : ""}{a.ch}%</b></div>
          <div className="kv"><span>Paid runs this week</span><b>{k(Math.round(a.runs * 0.8))}</b></div>
          <div className="kv"><span>Chain</span><b>{SITE.chain}</b></div>
          <div className="bb">Usage has bought back <b>${k(a.bb)}</b> of ${a.t}. Buying pressure that doesn&apos;t depend on hype.</div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="btn btn-gold" style={{ flex: 1 }} onClick={() => toast(`Connect a wallet to buy $${a.t}`)}>Buy ${a.t}</button>
            <button className="btn btn-g" onClick={() => toast("Contract address copied")}>Copy CA</button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FREE_RUNS_PER_AGENT, MIN_GRADED_TO_RANK } from "@/config/models";
import { SITE } from "@/config/site";
import { api, ApiError } from "@/lib/client";
import { copyText } from "@/lib/clipboard";
import { k, record, shortAddr, shortHash, timeAgo, until } from "@/lib/format";
import type { AgentView, CallStatus, CallView } from "@/lib/types";
import Avatar from "./Avatar";
import LineChart from "./LineChart";
import { useUI } from "./UIProvider";

const TABS: [string, string][] = [["try", "Try it"], ["perf", "Performance"], ["rec", "Receipts"], ["tok", "Token"]];

export type AgentDetail = { agent: AgentView; calls: CallView[]; series: (number | null)[]; freeRunsLeft: number | null };
type Msg = { u: boolean; text: string; call?: CallView; error?: boolean };

export function Status({ c, gradesAt }: { c: CallStatus; gradesAt?: string | null }) {
  if (c === "open") return <span className="st open">{gradesAt ? `Grades in ${until(gradesAt)}` : "Pending"}</span>;
  if (c === "hit") return <span className="st hit">Hit</span>;
  if (c === "miss") return <span className="st miss">Miss</span>;
  if (c === "void") return <span className="st">Void</span>;
  return <span className="st">Not graded</span>;
}

export function SealLine({ call }: { call: CallView }) {
  if (!call.claimHash) return <>Not a gradable call, so not sealed</>;
  if (!call.sealTx) return <>{call.label} · sealing onchain… · hash {shortHash(call.claimHash)}</>;
  return (
    <>
      {call.label} · sealed{" "}
      {call.sealUrl ? <a href={call.sealUrl} target="_blank" rel="noopener">{shortHash(call.claimHash)} ↗</a> : shortHash(call.claimHash)}
      {call.gradesAt && call.status === "open" && <> · graded in {until(call.gradesAt)}</>}
    </>
  );
}

// Everything about one agent: used by the drawer and by /agents/[slug].
export default function AgentPanel({ slug, initial }: { slug: string; initial?: AgentDetail }) {
  const { me, requireWallet, toast, toggleWatch, toggleAlert, bumpData } = useUI();
  const [data, setData] = useState<AgentDetail | null>(initial || null);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState("try");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [pending, setPending] = useState(false);
  const [q, setQ] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<AgentDetail>(`/api/agents/${slug}`));
    } catch (err) {
      setLoadError((err as Error).message);
    }
  }, [slug]);

  // Refresh on open and whenever the signed-in wallet changes (free-run count).
  useEffect(() => {
    load();
  }, [load, me?.wallet]);

  useEffect(() => {
    const c = chatRef.current;
    if (c) c.scrollTop = c.scrollHeight;
  }, [msgs, pending]);

  if (!data) return <div className="empty">{loadError || "Loading…"}</div>;
  const a = data.agent;

  const run = async (text: string) => {
    text = text.trim();
    if (!text || pending) return;
    if (!(await requireWallet())) return;
    setQ("");
    setMsgs((m) => [...m, { u: true, text }]);
    setPending(true);
    try {
      const res = await api<{ call: CallView; freeRunsLeft: number }>(`/api/agents/${slug}/run`, { body: { input: text } });
      setMsgs((m) => [...m, { u: false, text: res.call.output, call: res.call }]);
      setData((d) => d && { ...d, freeRunsLeft: res.freeRunsLeft, calls: [res.call, ...d.calls] });
      bumpData();
    } catch (err) {
      setMsgs((m) => [...m, { u: false, text: err instanceof ApiError ? err.message : "Something went wrong. Please try again.", error: true }]);
      if (err instanceof ApiError && err.status === 402) setData((d) => d && { ...d, freeRunsLeft: 0 });
    } finally {
      setPending(false);
    }
  };

  const left = data.freeRunsLeft;
  const freeText =
    left === null ? `Connect a wallet to try it: ${FREE_RUNS_PER_AGENT} free runs, then $${a.price.toFixed(2)} per run`
    : left > 0 ? `${left} free run${left > 1 ? "s" : ""} left, then $${a.price.toFixed(2)} per run`
    : "Free runs used. Paid runs open soon.";
  const examples = a.gradingMode === "price7d" ? ["LONG or SHORT on $TICKER?", "What are whales doing with 0x…?"] : ["Is 0x… bundled?", "Check the deployer of 0x…"];
  const graded = data.calls.filter((c) => c.status === "hit" || c.status === "miss");
  let best = 0, cur = 0;
  for (const c of [...graded].reverse()) {
    cur = c.status === "hit" ? cur + 1 : 0;
    best = Math.max(best, cur);
  }
  const week = data.calls.filter((c) => Date.now() - new Date(c.createdAt).getTime() < 7 * 86400_000).length;
  const alertOn = !!me?.alerts.includes(a.slug);
  const starOn = !!me?.watch.includes(a.slug);
  const agentUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/agents/${a.slug}`;

  return (
    <div>
      <div className="d-top">
        <Avatar a={a} />
        <div>
          <h3>{a.name}</h3>
          <span>${a.ticker} · {a.category} · {a.official ? "by Prova" : a.creator ? `by ${shortAddr(a.creator)}` : ""} · live {a.ageDays} day{a.ageDays === 1 ? "" : "s"}</span>
        </div>
      </div>
      <div className="d-stats">
        <div><small>Track record</small><b className="g">{a.ranked ? record(a.trackRecord) : "—"}</b></div>
        <div><small>Graded calls</small><b>{a.graded}</b></div>
        <div><small>Bought back</small><b>$0</b></div>
      </div>
      {!a.ranked && a.gradingMode !== "none" && (
        <p className="free" style={{ marginTop: -12, marginBottom: 16 }}>
          Ranks after {MIN_GRADED_TO_RANK} graded calls ({a.graded}/{MIN_GRADED_TO_RANK}){a.trackRecord !== null && `. Record so far: ${record(a.trackRecord)}`}.
        </p>
      )}
      <div className="d-actions">
        <button className={`swt ${alertOn ? "on" : ""}`} aria-pressed={alertOn} onClick={() => toggleAlert(a.slug)}>
          Telegram alert on every new call<i />
        </button>
        <button className={`star ${starOn ? "on" : ""}`} aria-label="Add to watchlist" aria-pressed={starOn} onClick={() => toggleWatch(a.slug)}>
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
          <div className="msg a">
            {a.tagline}. Ask me about any token on {SITE.chain} by its 0x address or $TICKER. Every verdict I give is sealed onchain.
            {!a.modelReady && <div className="claim" style={{ color: "var(--amber)" }}>This agent&apos;s model isn&apos;t connected yet, so runs will fail for now.</div>}
          </div>
          {msgs.map((m, i) => (
            <div key={i} className={`msg ${m.u ? "u" : "a"}`} style={m.error ? { color: "var(--miss)" } : undefined}>
              {m.text}
              {m.call && <div className="claim"><SealLine call={m.call} /></div>}
            </div>
          ))}
          {pending && <div className="typing">Pulling live data and thinking… this can take 20–40 seconds.</div>}
        </div>
        <div className="chips">
          {examples.map((s) => <button key={s} onClick={() => setQ(s.replace("0x…", "0x"))}>{s}</button>)}
        </div>
        <div className="ask">
          <input className="t" value={q} maxLength={500} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run(q)} placeholder={`Ask ${a.name}…`} aria-label={`Ask ${a.name}`} />
          <button className="btn btn-w" onClick={() => run(q)} disabled={pending}>Run</button>
        </div>
        <p className="free">{freeText}</p>
      </div>

      <div className={`dpane ${tab === "rec" ? "on" : ""}`}>
        {data.calls.length ? (
          <div className="rec">
            {data.calls.map((c) => (
              <div key={c.id}>
                <div>
                  <b>{c.label || c.input.slice(0, 60)}</b>
                  <small>
                    {c.subject ? shortHash(c.subject) + " · " : ""}{timeAgo(c.createdAt)} ago
                    {c.claimHash && <> · {c.sealUrl ? <a href={c.sealUrl} target="_blank" rel="noopener">seal {shortHash(c.claimHash)} ↗</a> : "sealing…"}</>}
                    {c.priceChangePct !== null && <> · price {c.priceChangePct > 0 ? "+" : ""}{c.priceChangePct}%</>}
                  </small>
                </div>
                <Status c={c.status} gradesAt={c.gradesAt} />
              </div>
            ))}
          </div>
        ) : (
          <div className="rec"><div><div><b>No calls yet</b><small>Run this agent to make its first sealed call.</small></div></div></div>
        )}
        <p className="free">Each call is sealed onchain before the result is known, so it can&apos;t be edited or deleted.</p>
      </div>

      <div className={`dpane ${tab === "perf" ? "on" : ""}`}>
        <div className="chartbox">
          <div className="lg">
            <span><i style={{ background: "var(--gold)" }} />Track record</span>
            <span style={{ marginLeft: "auto", color: "var(--t3)" }}>Last 30 days</span>
          </div>
          {data.series.some((v) => v !== null) ? (
            <LineChart id={`perf-${a.slug}`} list={[{ d: data.series, c: "#E2CDA6", fill: true }]} w={480} h={170} />
          ) : (
            <div className="empty" style={{ padding: "40px 12px" }}>The chart starts with the first graded call.</div>
          )}
        </div>
        <div className="pstats">
          <div><small>Best streak</small><b>{best} hit{best === 1 ? "" : "s"}</b></div>
          <div><small>Time to grade</small><b>{a.gradingMode === "price7d" ? "7d" : a.gradingMode === "verdict24h" ? "24h" : "—"}</b></div>
          <div><small>Calls this week</small><b>{week}</b></div>
        </div>
      </div>

      <div className={`dpane ${tab === "tok" ? "on" : ""}`}>
        <div className="tok">
          <div className="kv"><span>Token</span><b>{a.tokenAddress ? shortHash(a.tokenAddress) : `$${a.ticker} · not launched yet`}</b></div>
          <div className="kv"><span>Paid runs this week</span><b>{k(0)}</b></div>
          <div className="kv"><span>Price per run</span><b>${a.price.toFixed(2)} after {FREE_RUNS_PER_AGENT} free</b></div>
          <div className="kv"><span>Model</span><b>{a.model}</b></div>
          <div className="kv"><span>Chain</span><b>{SITE.chain}</b></div>
          <div className="bb">Agent tokens launch on Robinfun soon. Then <b>30% of every paid run</b> buys back and burns ${a.ticker}.</div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <a className="btn btn-gold" style={{ flex: 1 }} href={`/agents/${a.slug}`}>Open agent page</a>
            <button className="btn btn-g" onClick={() => copyText(agentUrl).then(() => toast("Link copied"))}>Copy link</button>
          </div>
        </div>
      </div>
    </div>
  );
}

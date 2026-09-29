"use client";

import { shortHash } from "@/lib/format";
import Avatar from "./Avatar";
import { useHome } from "./HomeData";

// LIVE marquee of the latest calls. The list is rendered twice so the loop is seamless.
export default function Ticker() {
  const { calls } = useHome();
  const items = calls.slice(0, 14);
  const row = (copy: number) =>
    items.length ? (
      items.map((c) => (
        <span className="tk-item" key={`${copy}-${c.id}`} aria-hidden={copy === 1 || undefined}>
          <Avatar a={c.agent} style={{ width: 20, height: 20, fontSize: 9, borderRadius: 6 }} />
          <b>{c.agent.name}</b>
          {c.subject ? shortHash(c.subject) : ""} · {c.label}
          <code>{c.sealTx ? "sealed" : "sealing"} {c.claimHash ? shortHash(c.claimHash) : ""}</code>
        </span>
      ))
    ) : (
      [0, 1, 2, 3].map((i) => (
        <span className="tk-item" key={`${copy}-${i}`} aria-hidden={copy === 1 || i > 0 || undefined}>
          <b>No calls yet</b> Open any agent and run it free. Its call shows up here in seconds.
        </span>
      ))
    );
  return (
    <div className="ticker" aria-label="Live calls">
      <div className="tk-label"><span className="pulse" />LIVE</div>
      <div className="tk-track">{row(0)}{row(1)}</div>
    </div>
  );
}

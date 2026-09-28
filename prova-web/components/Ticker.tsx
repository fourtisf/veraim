"use client";

import { useState } from "react";
import { seeded, tickerItems } from "@/lib/mock";
import Avatar from "./Avatar";

// LIVE marquee. The list is rendered twice so the loop is seamless.
export default function Ticker() {
  const [items] = useState(() => tickerItems(seeded(7)));
  const row = (copy: number) =>
    items.map((it) => (
      <span className="tk-item" key={`${copy}-${it.id}`} aria-hidden={copy === 1 || undefined}>
        <Avatar a={it.a} style={{ width: 20, height: 20, fontSize: 9, borderRadius: 6 }} />
        <b>{it.a.n}</b>
        {it.subject} · {it.verdict}
        <code>sealed {it.hash}</code>
      </span>
    ));
  return (
    <div className="ticker" aria-label="Live sealed calls">
      <div className="tk-label"><span className="pulse" />LIVE</div>
      <div className="tk-track">{row(0)}{row(1)}</div>
    </div>
  );
}

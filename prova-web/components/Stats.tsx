"use client";

import { useEffect, useRef } from "react";
import type { SiteStats } from "@/lib/types";

const fmt = (v: number, dec: number) => v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });

type Stat = { to: number | null; dec: number; pre: string; suf: string; start: string; label: string };

// Four hero stats that count up once they scroll into view. All of them are live numbers.
export default function Stats({ stats }: { stats: SiteStats }) {
  const ref = useRef<HTMLDivElement>(null);
  const mc = stats.marketCapTracked;
  const big = mc !== null && mc >= 1e9;
  const list: Stat[] = [
    { to: stats.callsMade, dec: 0, pre: "", suf: "", start: "0", label: "Calls made by agents" },
    { to: stats.tokensChecked, dec: 0, pre: "", suf: "", start: "0", label: "Tokens checked" },
    { to: mc === null ? null : big ? mc / 1e9 : mc / 1e6, dec: big ? 2 : 1, pre: "$", suf: big ? "B" : "M", start: "$0", label: "Market cap tracked" },
    { to: stats.typicalPrice, dec: 2, pre: "$", suf: "", start: "$0.00", label: "Typical price per run" },
  ];
  const final = (s: Stat) => (s.to === null ? "—" : s.pre + fmt(s.to, s.dec) + s.suf);

  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const els = [...box.querySelectorAll<HTMLElement>("strong")];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const start = () => {
      const t0 = performance.now(), D = reduced ? 0 : 1600;
      const frame = (t: number) => {
        const p = D ? Math.min(1, (t - t0) / D) : 1;
        const e = 1 - Math.pow(1 - p, 4);
        els.forEach((el, i) => {
          const s = list[i];
          el.textContent = s.to === null ? "—" : s.pre + fmt(s.to * e, s.dec) + s.suf;
        });
        if (p < 1) raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };
    if (!("IntersectionObserver" in window)) { start(); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((en) => en.isIntersecting)) { io.disconnect(); start(); }
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    io.observe(box);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="stats" ref={ref}>
      {list.map((s) => (
        <div key={s.label}>
          <strong suppressHydrationWarning>{s.to === null ? "—" : s.start}</strong>
          <span>{s.label}</span>
        </div>
      ))}
      <noscript>{list.map(final).join(" · ")}</noscript>
    </div>
  );
}

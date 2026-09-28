"use client";

import { useEffect, useRef } from "react";
import { STATS } from "@/lib/mock";

const fmt = (v: number, dec: number) => v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });

// Four hero stats that count up once they scroll into view.
export default function Stats() {
  const ref = useRef<HTMLDivElement>(null);

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
          const s = STATS[i];
          el.textContent = s.pre + fmt(s.to * e, s.dec) + s.suf;
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
  }, []);

  return (
    <div className="stats" ref={ref}>
      {STATS.map((s) => (
        <div key={s.label}>
          <strong>{s.start}</strong>
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

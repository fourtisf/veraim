"use client";

import { useEffect } from "react";

// Page-wide motion from the prototype:
// - scroll reveal: elements with .rv get .in when they scroll into view
// - spotlight: elements with .spot track the pointer via --mx / --my
export default function Effects() {
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>(".rv")];
    let io: IntersectionObserver | undefined;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => entries.forEach((en) => {
          if (!en.isIntersecting) return;
          en.target.classList.add("in");
          io?.unobserve(en.target);
        }),
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
      );
      els.forEach((el) => io!.observe(el));
    } else {
      els.forEach((el) => el.classList.add("in"));
    }
    // Safety: never leave on-screen content hidden if the observer misses.
    const t = setTimeout(() => els.forEach((el) => { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("in"); }), 1200);

    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.<HTMLElement>(".spot");
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", e.clientX - r.left + "px");
      el.style.setProperty("--my", e.clientY - r.top + "px");
    };
    document.addEventListener("pointermove", onMove, { passive: true });

    return () => { io?.disconnect(); clearTimeout(t); document.removeEventListener("pointermove", onMove); };
  }, []);
  return null;
}

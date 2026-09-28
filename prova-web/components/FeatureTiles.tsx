"use client";

import type { ReactNode } from "react";
import { scrollToSection } from "@/lib/scroll";
import { useUI } from "./UIProvider";

const Ic = ({ d }: { d: ReactNode }) => (
  <span className="ic">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
  </span>
);

const TILES: { go: string; icon: ReactNode; title: string; text: string; cta: ReactNode }[] = [
  { go: "#live", icon: <><circle cx="12" cy="12" r="3" /><path d="M5.6 5.6a9 9 0 000 12.8M18.4 5.6a9 9 0 010 12.8" /></>, title: "Live call feed", text: "Watch verdicts get sealed onchain in real time, then graded.", cta: "Open feed →" },
  { go: "#compare", icon: <path d="M7 4v16M17 4v16M3 8l4-4 4 4M13 16l4 4 4-4" />, title: "Compare agents", text: "Two agents head to head: 30-day chart and every metric side by side.", cta: "Compare now →" },
  { go: "#earn", icon: <path d="M12 2v20M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />, title: "Earnings calculator", text: "Slide runs, price and volume to see what an agent earns you monthly.", cta: "Calculate →" },
  { go: "cmdk", icon: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>, title: "Instant search", text: "Find any agent or page from the keyboard without scrolling.", cta: <>Press <kbd>⌘K</kbd> →</> },
  { go: "#build", icon: <path d="M12 5v14M5 12h14" />, title: "Agent builder", text: "Name it, brief it, give it tools and launch its token. No code.", cta: "Start building →" },
  { go: "#api", icon: <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" />, title: "Developer API", text: "REST, MCP, webhooks and SDKs. Plug any agent into your app.", cta: "See code →" },
];

export default function FeatureTiles() {
  const { openPalette } = useUI();
  return (
    <section id="tour" style={{ paddingTop: 110 }}>
      <div className="wrap">
        <div className="head rv">
          <span className="kicker">Inside Veraim</span>
          <h2>Everything in one place.</h2>
          <p>Jump straight to any feature. Tap an agent in the leaderboard to try it, see its performance chart, set Telegram alerts or add it to your watchlist.</p>
        </div>
        <div className="tour">
          {TILES.map((t) => (
            <button key={t.go} className="tile spot rv" onClick={() => (t.go === "cmdk" ? openPalette() : scrollToSection(t.go))}>
              <Ic d={t.icon} />
              <b>{t.title}</b>
              <p>{t.text}</p>
              <span className="go2">{t.cta}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

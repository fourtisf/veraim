"use client";

import { useEffect, useState } from "react";
import { SITE } from "@/config/site";
import { money } from "@/lib/format";
import { questionFor } from "@/lib/tokenQuestion";
import { useUI } from "./UIProvider";

type Token = {
  address: string; symbol: string; name: string; imageUrl: string | null; url: string | null;
  priceUsd: number; marketCapUsd: number; liquidityUsd: number; priceChange24h: number | null;
};

const SITE_EXPLORER = "https://robinhoodchain.blockscout.com";
const price = (n: number) => (n >= 1 ? "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 }) : n > 0 ? "$" + n.toPrecision(3) : "—");

// The biggest live tokens on the chain, each with one click to ask an agent about it.
export default function TopTokens() {
  const { openAgent } = useUI();
  const [tokens, setTokens] = useState<Token[] | null>(null);

  useEffect(() => {
    fetch("/api/tokens/top?limit=10").then((r) => r.json()).then((d) => setTokens(d.tokens || [])).catch(() => setTokens([]));
  }, []);

  if (tokens && !tokens.length) return null; // market data unavailable: hide the section
  const ask = (slug: string, category: string, gradingMode: string, t: Token) => openAgent(slug, questionFor({ category, gradingMode }, t));

  return (
    <section id="tokens">
      <div className="wrap">
        <div className="head rv">
          <span className="kicker">Top tokens on {SITE.chain}</span>
          <h2>Ask an agent before you buy</h2>
          <p>The biggest tokens on {SITE.chain} right now. Pick one and an agent checks it for you. Every answer is sealed onchain and graded by the market.</p>
        </div>
        <div className="list tt rv">
          <div className="tt-row hd"><span>#</span><span>Token</span><span className="c-p">Price</span><span>24h</span><span>Market cap</span><span className="c-l">Liquidity</span><span className="tt-ask">Ask an agent</span></div>
          {!tokens && <div className="empty">Loading live market data…</div>}
          {tokens?.map((t, i) => (
            <div className="tt-row" key={t.address}>
              <span className="rank">{String(i + 1).padStart(2, "0")}</span>
              <a className="tt-tok" href={t.url || `${SITE_EXPLORER}/token/${t.address}`} target="_blank" rel="noopener" title={t.address}>
                {t.imageUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={t.imageUrl} alt="" width={32} height={32} />
                  : <i>{t.symbol.slice(0, 1)}</i>}
                <span><b>${t.symbol}</b><small>{t.name}</small></span>
              </a>
              <span className="num c-p">{price(t.priceUsd)}</span>
              <span className={`num ${t.priceChange24h === null ? "" : t.priceChange24h >= 0 ? "up" : "dn"}`}>
                {t.priceChange24h === null ? "—" : `${t.priceChange24h >= 0 ? "+" : ""}${t.priceChange24h.toFixed(1)}%`}
              </span>
              <span className="num">{money(t.marketCapUsd)}</span>
              <span className="num c-l">{money(t.liquidityUsd)}</span>
              <span className="tt-go">
                <button onClick={() => ask("bundle-hound", "Security", "verdict24h", t)} title={`Veraim Safety Agent checks if $${t.symbol} is safe`}>Is it safe?</button>
                <button onClick={() => ask("tidewatch", "Trading calls", "price7d", t)} title={`Veraim Whale Agent calls long or short on $${t.symbol}`}>Long or short?</button>
              </span>
            </div>
          ))}
        </div>
        <p className="hint" style={{ marginTop: 14 }}>Live from DexScreener, refreshed every 15 minutes. Tokens with less than $10K liquidity are left out. Not financial advice.</p>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/client";
import { payQuote, type ChainInfo, type Quote } from "@/lib/wallet";
import { useUI } from "./UIProvider";

const PACKS = [1, 10, 50];

// Buy paid runs for one agent in ETH or USDG. The payment is split onchain:
// 60% to the creator, 30% to buy back and burn the agent's token, 10% to Prova.
export default function BuyRuns({ slug, price, onPaid }: { slug: string; price: number; onPaid: (runs: number) => void }) {
  const { requireWallet, toast } = useUI();
  const [asset, setAsset] = useState<"ETH" | "USDG">("ETH");
  const [busy, setBusy] = useState<number | null>(null);
  const [status, setStatus] = useState("");

  const buy = async (quantity: number) => {
    if (busy || !(await requireWallet())) return;
    setBusy(quantity);
    try {
      setStatus("Getting a price…");
      const { quote, chain } = await api<{ quote: Quote; chain: ChainInfo }>(`/api/agents/${slug}/quote`, { body: { quantity, asset } });
      setStatus(asset === "USDG" ? "Approve and confirm in your wallet…" : "Confirm in your wallet…");
      const txHash = await payQuote(quote, chain);
      setStatus("Confirming onchain…");
      const { credited } = await api<{ credited: number }>("/api/payments/confirm", { body: { txHash } });
      onPaid(credited);
      toast(`${credited} run${credited > 1 ? "s" : ""} added`);
      setStatus("");
    } catch (err) {
      const code = (err as { code?: number }).code;
      setStatus(code === 4001 ? "Payment cancelled." : err instanceof ApiError || err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="buy">
      <div className="buy-h">
        <b>Buy runs</b>
        <div className="seg">
          {(["ETH", "USDG"] as const).map((x) => (
            <label key={x}><input type="radio" name={`asset-${slug}`} checked={asset === x} onChange={() => setAsset(x)} />{x}</label>
          ))}
        </div>
      </div>
      <div className="chips">
        {PACKS.map((n) => (
          <button key={n} onClick={() => buy(n)} disabled={!!busy}>
            {busy === n ? "Working…" : `${n} run${n > 1 ? "s" : ""} · $${(price * n).toFixed(2)}`}
          </button>
        ))}
      </div>
      <p className="free" style={{ marginTop: 0 }}>{status || "Paid onchain on Robinhood Chain: 60% to the creator, 30% buys back and burns the agent's token, 10% to Prova."}</p>
    </div>
  );
}

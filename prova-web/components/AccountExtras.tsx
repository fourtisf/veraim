"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { copyText } from "@/lib/clipboard";
import { money, timeAgo } from "@/lib/format";
import { withdrawFunds, type ChainInfo } from "@/lib/wallet";
import { useUI } from "./UIProvider";

type Earnings = { claimable: { eth: string; usdg: string }; lifetimeUsd: number; runsSold: number; chain: ChainInfo };

// Creator earnings held by the VeraimRuns contract, withdrawn straight to the wallet.
export function EarningsCard() {
  const { toast } = useUI();
  const [e, setE] = useState<Earnings | null>(null);
  const [busy, setBusy] = useState("");
  const load = useCallback(() => api<Earnings>("/api/earnings").then(setE).catch(() => {}), []);
  useEffect(() => {
    load();
  }, [load]);
  if (!e) return null;
  const eth = Number(e.claimable.eth) / 1e18;
  const usdg = Number(e.claimable.usdg) / 1e6;

  const withdraw = async (asset: "ETH" | "USDG") => {
    setBusy(asset);
    try {
      await withdrawFunds(e.chain, asset);
      toast(`${asset} sent to your wallet`);
      load();
    } catch (err) {
      toast((err as { code?: number }).code === 4001 ? "Cancelled" : (err as Error).message);
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <h3 style={{ fontSize: 17, fontWeight: 500, marginTop: 34 }}>Earnings</h3>
      <p className="hint">You get 60% of every paid run of your agents, held in the VeraimRuns contract until you withdraw. Lifetime: {money(e.lifetimeUsd)} from {e.runsSold} runs.</p>
      {!e.chain.enabled ? (
        <p className="hint">Paid runs aren&apos;t switched on yet.</p>
      ) : (
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button className="btn btn-g" disabled={!eth || !!busy} onClick={() => withdraw("ETH")}>{busy === "ETH" ? "Withdrawing…" : `Withdraw ${eth.toFixed(6)} ETH`}</button>
          <button className="btn btn-g" disabled={!usdg || !!busy} onClick={() => withdraw("USDG")}>{busy === "USDG" ? "Withdrawing…" : `Withdraw ${usdg.toFixed(2)} USDG`}</button>
        </div>
      )}
    </>
  );
}

type Hook = { id: string; url: string; disabled: boolean; failures: number; lastError: string | null; lastOkAt: string | null };

// Signed webhooks for calls of agents on the watchlist.
export function WebhooksCard() {
  const { toast } = useUI();
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const load = useCallback(() => api<{ webhooks: Hook[] }>("/api/webhooks").then((r) => setHooks(r.webhooks)).catch(() => {}), []);
  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    try {
      const r = await api<{ secret: string }>("/api/webhooks", { body: { url } });
      setSecret(r.secret);
      setUrl("");
      load();
    } catch (err) {
      toast((err as Error).message);
    }
  };
  const remove = async (id: string) => {
    await api(`/api/webhooks?id=${id}`, { method: "DELETE" }).catch(() => {});
    load();
  };

  return (
    <>
      <h3 style={{ fontSize: 17, fontWeight: 500, marginTop: 34 }}>Webhooks</h3>
      <p className="hint">
        We POST <code className="mono">call.sealed</code> and <code className="mono">call.graded</code> events for every agent on your watchlist, signed with{" "}
        <code className="mono">X-Veraim-Signature: t=…,v1=HMAC-SHA256(secret, &quot;t.body&quot;)</code>.
      </p>
      {secret && (
        <div className="keybox">
          <code style={{ display: "block", userSelect: "all" }}>{secret}</code>
          <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", fontFamily: "var(--f)" }}>
            <button className="btn btn-g" style={{ height: 32 }} onClick={() => copyText(secret).then(() => toast("Secret copied"))}>Copy</button>
            <span className="hint" style={{ margin: 0 }}>Signing secret. Save it now.</span>
          </div>
        </div>
      )}
      {hooks.length > 0 && (
        <table className="tbl" style={{ marginTop: 14 }}>
          <tbody>
            {hooks.map((h) => (
              <tr key={h.id}>
                <td className="mono" style={{ wordBreak: "break-all" }}>{h.url}</td>
                <td style={{ color: h.disabled || h.failures ? "var(--miss)" : "var(--t3)" }}>
                  {h.disabled ? "Disabled after failures" : h.failures ? `Failing: ${h.lastError}` : h.lastOkAt ? `OK ${timeAgo(h.lastOkAt)} ago` : "No events yet"}
                </td>
                <td style={{ textAlign: "right" }}><button className="cpy" onClick={() => remove(h.id)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="ask" style={{ marginTop: 14 }}>
        <input className="t" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-app.com/veraim-webhook" aria-label="Webhook URL" />
        <button className="btn btn-w" onClick={add}>Add</button>
      </div>
    </>
  );
}

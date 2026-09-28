"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { useUI } from "./UIProvider";

// Creator-only: link the token launched for this agent. Final once registered onchain.
export default function LinkToken({ slug, onLinked }: { slug: string; onLinked: () => void }) {
  const { toast } = useUI();
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const link = async () => {
    if (!/^0x[0-9a-fA-F]{40}$/.test(address.trim())) return toast("Paste the token's contract address (0x…)");
    if (!confirm("Link this token? Once it's registered onchain it can't be changed.")) return;
    setBusy(true);
    try {
      const { symbol } = await api<{ symbol: string }>(`/api/agents/${slug}/token`, { body: { address: address.trim() } });
      toast(`$${symbol} linked. Buybacks switch on within a minute`);
      onLinked();
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div style={{ marginTop: 14 }}>
      <label className="f" style={{ marginTop: 0 }}>You created this agent. Launched its token? Link it:</label>
      <div className="ask">
        <input className="t" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Token contract address 0x…" aria-label="Token contract address" />
        <button className="btn btn-w" onClick={link} disabled={busy}>{busy ? "Linking…" : "Link"}</button>
      </div>
    </div>
  );
}

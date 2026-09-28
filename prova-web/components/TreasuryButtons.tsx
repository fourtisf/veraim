"use client";

import { useState } from "react";
import { withdrawFunds, type ChainInfo } from "@/lib/wallet";
import { useUI } from "./UIProvider";

// Sends the treasury share held by ProvaRuns to the treasury wallet (anyone may trigger it).
export default function TreasuryButtons({ chain, eth, usdg }: { chain: ChainInfo; eth: number; usdg: number }) {
  const { toast } = useUI();
  const [busy, setBusy] = useState("");
  const go = async (asset: "ETH" | "USDG") => {
    setBusy(asset);
    try {
      await withdrawFunds(chain, asset, true);
      toast(`Treasury ${asset} sent`);
      location.reload();
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setBusy("");
    }
  };
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
      <button className="btn btn-g" disabled={!eth || !!busy} onClick={() => go("ETH")}>Send {eth.toFixed(6)} ETH to treasury</button>
      <button className="btn btn-g" disabled={!usdg || !!busy} onClick={() => go("USDG")}>Send {usdg.toFixed(2)} USDG to treasury</button>
    </div>
  );
}

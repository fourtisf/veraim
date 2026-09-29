"use client";

import { useEffect, useState } from "react";
import { walletErrorMessage } from "@/lib/client";
import { GENERIC_ICON, installedWallets, isMobile, KNOWN_WALLETS, onWalletsChanged, startDiscovery, type WalletOption } from "@/lib/walletProviders";

// "Connect a wallet": wallets found in this browser first, then popular wallets to open or install.
export default function WalletModal({ onPick, onClose }: { onPick: (w: WalletOption) => Promise<void>; onClose: () => void }) {
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    startDiscovery();
    const refresh = () => setWallets(installedWallets());
    refresh();
    setMobile(isMobile());
    return onWalletsChanged(refresh);
  }, []);

  const pick = async (w: WalletOption) => {
    setBusy(w.id);
    setError("");
    try {
      await onPick(w);
    } catch (err) {
      setError(walletErrorMessage(err));
    } finally {
      setBusy("");
    }
  };

  const here = typeof window !== "undefined" ? window.location.href : "";
  const others = KNOWN_WALLETS.filter((k) => !wallets.some((w) => w.id === k.id || w.name === k.name));

  return (
    <div className="wl-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="wl wm" role="dialog" aria-modal="true" aria-labelledby="wm-title">
        <button className="dx" onClick={onClose} aria-label="Close">✕</button>
        <h3 id="wm-title">Connect a wallet</h3>
        <p>Sign in by signing a message. It never sends a transaction or costs gas.</p>

        {wallets.length > 0 && (
          <>
            <div className="wm-label">Installed</div>
            <div className="wm-list">
              {wallets.map((w) => (
                <button key={w.id} className="wm-item" disabled={!!busy} onClick={() => pick(w)}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- wallet icons are data: URLs */}
                  <img src={w.icon || GENERIC_ICON} alt="" width={36} height={36} />
                  <span className="wm-name">{w.name}</span>
                  <span className="wm-tag">{busy === w.id ? "Check your wallet…" : "Detected"}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {error && <p className="err" role="alert">{error}</p>}

        <div className="wm-label">{wallets.length ? "Other wallets" : mobile ? "Open Veraim in your wallet app" : "Get a wallet"}</div>
        <div className="wm-list">
          {others.map((k) => {
            const href = mobile && k.open ? k.open(here) : k.install;
            return (
              <a key={k.id} className="wm-item" href={href} target={mobile && k.open ? "_self" : "_blank"} rel="noopener">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={k.icon} alt="" width={36} height={36} />
                <span className="wm-name">{k.name}</span>
                <span className="wm-tag">{mobile && k.open ? "Open app ↗" : "Install ↗"}</span>
              </a>
            );
          })}
        </div>
        {!wallets.length && (
          <p className="hint" style={{ marginTop: 14 }}>
            {mobile ? "Tap your wallet to open Veraim inside its app, then press Connect wallet there." : "No wallet found in this browser. Install one, then refresh this page."}
          </p>
        )}
      </div>
    </div>
  );
}

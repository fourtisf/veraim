"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { SITE } from "@/config/site";
import { normalizeEntry, type WaitlistSource } from "@/lib/waitlist";
import { CheckIcon } from "./icons";

export type { WaitlistSource };

const COPY: Record<WaitlistSource, { title: (name?: string) => string; text: string }> = {
  wallet: {
    title: () => "No wallet found",
    text: "To sign in, open Prova in your wallet app's browser (MetaMask, Rabby, Coinbase Wallet…) or install a wallet extension. Or leave an email and we'll send launch updates.",
  },
  cta: {
    title: () => "Get launch updates",
    text: "Leave an email or wallet address and we'll tell you when the Prova token and paid runs go live.",
  },
  launch: {
    title: (name) => `Save your spot to launch ${name || "your agent"}`,
    text: "Agent token launches open soon. Leave an email or wallet address and you'll be first to know.",
  },
};

export default function WaitlistModal({ source, agentName, onClose }: { source: WaitlistSource; agentName?: string; onClose: () => void }) {
  const [value, setValue] = useState("");
  const [trap, setTrap] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const copy = COPY[source];

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 20);
    fetch("/api/waitlist").then((r) => r.json()).then((d) => setCount(d.count ?? null)).catch(() => {});
    return () => clearTimeout(t);
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!normalizeEntry(value)) {
      setError("Enter a valid email or wallet address (0x…).");
      return;
    }
    setError("");
    setState("sending");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value, source, website: trap }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      if (data.count) setCount(data.count);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setState("idle");
    }
  };

  return (
    <div className="wl-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="wl" role="dialog" aria-modal="true" aria-labelledby="wl-title">
        <button className="dx" onClick={onClose} aria-label="Close">✕</button>
        <span className="mark" style={{ display: "block" }} />
        <h3 id="wl-title">{copy.title(agentName)}</h3>
        {state === "done" ? (
          <>
            <div className="ok">
              <span className="check"><CheckIcon /></span>
              You&apos;re on the list. We&apos;ll be in touch.
            </div>
            <button className="btn btn-g" style={{ width: "100%", marginTop: 12 }} onClick={onClose}>Close</button>
          </>
        ) : (
          <form onSubmit={submit} noValidate>
            <p>{copy.text}</p>
            {SITE.launchDate && <p>Token launch: <b style={{ color: "var(--gold)" }}>{SITE.launchDate}</b></p>}
            <input
              ref={inputRef}
              className="t"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="you@email.com or 0x…"
              aria-label="Email or wallet address"
              autoComplete="email"
              maxLength={254}
            />
            <input className="hp" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} aria-hidden="true" name="website" />
            {error && <p className="err" role="alert">{error}</p>}
            <button className="btn btn-gold" type="submit" disabled={state === "sending"}>
              {state === "sending" ? "Joining…" : "Join the waitlist"}
            </button>
            {count !== null && count > 0 && <p className="hint">{count.toLocaleString("en-US")} people already joined</p>}
          </form>
        )}
      </div>
    </div>
  );
}

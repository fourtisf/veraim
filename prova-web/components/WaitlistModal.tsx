"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { normalizeEntry, type WaitlistSource } from "@/lib/waitlist";
import { CheckIcon } from "./icons";

export type { WaitlistSource };

const COPY: Record<WaitlistSource, { title: (name?: string) => string; text: string }> = {
  wallet: {
    title: () => "Join the waitlist",
    text: "Wallet connection opens at launch. Leave an email or wallet address and we'll tell you when Prova goes live.",
  },
  launch: {
    title: (name) => `Save your spot to launch ${name || "your agent"}`,
    text: "Agent launches open soon. Leave an email or wallet address and you'll be first to know.",
  },
};

export default function WaitlistModal({ source, agentName, onClose }: { source: WaitlistSource; agentName?: string; onClose: () => void }) {
  const [value, setValue] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const copy = COPY[source];

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 20);
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
        body: JSON.stringify({ value, source }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
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
            {error && <p className="err" role="alert">{error}</p>}
            <button className="btn btn-gold" type="submit" disabled={state === "sending"}>
              {state === "sending" ? "Joining…" : "Join the waitlist"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

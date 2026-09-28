"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { normalizeEntry } from "@/lib/waitlist";
import { useHome } from "./HomeData";
import { useUI } from "./UIProvider";

export default function FinalCta() {
  const { stats } = useHome();
  const { toast } = useUI();
  const [value, setValue] = useState("");
  const [trap, setTrap] = useState("");
  const [count, setCount] = useState(stats.waitlistCount);
  const [done, setDone] = useState(false);

  const join = async (e: FormEvent) => {
    e.preventDefault();
    if (!normalizeEntry(value)) return toast("Enter a valid email or wallet address (0x…)");
    try {
      const r = await api<{ count: number }>("/api/waitlist", { body: { value, source: "cta", website: trap } });
      setCount(r.count);
      setDone(true);
    } catch (err) {
      toast((err as Error).message);
    }
  };

  return (
    <section style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="final rv">
          <h2>Every record starts with one call.</h2>
          <p>Launch an agent today. Let the results do the marketing.</p>
          <div className="ctas">
            <a href="#build" className="btn btn-gold btn-lg">Launch your agent</a>
            <a href="#agents" className="btn btn-g btn-lg">See the leaderboard</a>
          </div>
          <form className="cta-wl" onSubmit={join}>
            {done ? (
              <p className="ok-line">You&apos;re on the list. {count.toLocaleString("en-US")} people are waiting for the token launch.</p>
            ) : (
              <>
                <input className="t" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Email or wallet for launch updates" aria-label="Email or wallet for launch updates" maxLength={254} />
                <input className="hp" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} aria-hidden="true" name="website" />
                <button className="btn btn-w" type="submit">Notify me</button>
              </>
            )}
          </form>
          {!done && count > 0 && <p className="hint" style={{ margin: "10px auto 0" }}>{count.toLocaleString("en-US")} already joined</p>}
        </div>
      </div>
    </section>
  );
}

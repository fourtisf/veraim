"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { copyText } from "@/lib/clipboard";
import { record, timeAgo } from "@/lib/format";
import type { AgentView } from "@/lib/types";
import Avatar from "./Avatar";
import { useUI } from "./UIProvider";

type Key = { id: string; prefix: string; createdAt: string; lastUsedAt: string | null };

export default function Account() {
  const { me, meLoaded, connect, signOut, toast, openAgent } = useUI();
  const [keys, setKeys] = useState<Key[]>([]);
  const [newKey, setNewKey] = useState("");
  const [agents, setAgents] = useState<AgentView[]>([]);

  const load = useCallback(async () => {
    if (!me) return;
    const [k, a] = await Promise.all([api<{ keys: Key[] }>("/api/keys"), api<{ agents: AgentView[] }>("/api/agents")]);
    setKeys(k.keys);
    setAgents(a.agents);
  }, [me]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  if (!meLoaded) return <div className="empty">Loading…</div>;
  if (!me) {
    return (
      <div className="panel" style={{ maxWidth: 520 }}>
        <p style={{ color: "var(--t2)", marginBottom: 18 }}>Connect your wallet to see your account. Signing in is free and never sends a transaction.</p>
        <button className="btn btn-w" onClick={() => connect()}>Connect wallet</button>
      </div>
    );
  }

  const createKey = async () => {
    try {
      const { key } = await api<{ key: string }>("/api/keys", { body: {} });
      setNewKey(key);
      load();
    } catch (err) {
      toast((err as Error).message);
    }
  };
  const revoke = async (id: string) => {
    await api(`/api/keys?id=${id}`, { method: "DELETE" }).catch(() => {});
    load();
  };

  const watched = agents.filter((a) => me.watch.includes(a.slug));
  const mine = agents.filter((a) => a.creator === me.wallet);

  const agentRows = (list: AgentView[], empty: string) =>
    list.length ? (
      <table className="tbl">
        <tbody>
          {list.map((a) => (
            <tr key={a.id} onClick={() => openAgent(a.slug)} style={{ cursor: "pointer" }}>
              <td><div className="mini"><Avatar a={a} style={{ width: 26, height: 26, fontSize: 11 }} /><span>{a.name}</span></div></td>
              <td>{a.ranked ? record(a.trackRecord) : `${a.graded} graded`}</td>
              <td style={{ color: "var(--t3)" }}>{a.runs7d} runs / 7d</td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <p className="hint">{empty}</p>
    );

  return (
    <div className="grid2">
      <div className="panel">
        <h3 style={{ fontSize: 17, fontWeight: 500 }}>Wallet</h3>
        <p className="mono" style={{ marginTop: 10, wordBreak: "break-all" }}>{me.wallet}</p>
        <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
          <button className="btn btn-g" onClick={() => signOut()}>Sign out</button>
          {me.admin && <a className="btn btn-g" href="/admin">Admin</a>}
        </div>

        <h3 style={{ fontSize: 17, fontWeight: 500, marginTop: 34 }}>Telegram alerts</h3>
        <p className="hint">
          {!me.telegramReady ? "Telegram alerts aren't switched on yet."
            : me.telegramLinked ? `Linked. Alerts on for ${me.alerts.length} agent${me.alerts.length === 1 ? "" : "s"}. Send /stop to the bot to pause them all.`
            : "Turn on the Telegram switch on any agent to link your chat."}
        </p>

        <h3 style={{ fontSize: 17, fontWeight: 500, marginTop: 34 }}>API keys</h3>
        <p className="hint">Use a key to run agents from your own code: <code className="mono">POST /api/v1/agents/:slug/run</code>. Runs count against the same free runs as the site.</p>
        {newKey && (
          <div className="keybox">
            <code style={{ display: "block", userSelect: "all" }}>{newKey}</code>
            <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", fontFamily: "var(--f)" }}>
              <button className="btn btn-g" style={{ height: 32 }} onClick={() => copyText(newKey).then(() => toast("Key copied"))}>Copy</button>
              <span className="hint" style={{ margin: 0 }}>Save it now. It won&apos;t be shown again.</span>
            </div>
          </div>
        )}
        {keys.length > 0 && (
          <table className="tbl" style={{ marginTop: 14 }}>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id}>
                  <td><code>{k.prefix}…</code></td>
                  <td style={{ color: "var(--t3)" }}>{k.lastUsedAt ? `used ${timeAgo(k.lastUsedAt)} ago` : "never used"}</td>
                  <td style={{ textAlign: "right" }}><button className="cpy" onClick={() => revoke(k.id)}>Revoke</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button className="btn btn-w" style={{ marginTop: 14 }} onClick={createKey}>Create API key</button>
      </div>

      <div className="panel">
        <h3 style={{ fontSize: 17, fontWeight: 500, marginBottom: 12 }}>Agents you built</h3>
        {agentRows(mine, "None yet. Build one in four steps on the home page.")}
        <h3 style={{ fontSize: 17, fontWeight: 500, margin: "30px 0 12px" }}>Watchlist</h3>
        {agentRows(watched, "Tap the star on any agent to watch it.")}
      </div>
    </div>
  );
}

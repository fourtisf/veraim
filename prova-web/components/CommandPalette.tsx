"use client";

import { useEffect, useRef, useState } from "react";
import { AGENTS, PAGES } from "@/lib/mock";
import { scrollToSection } from "@/lib/scroll";
import Avatar from "./Avatar";
import { SearchIcon } from "./icons";
import { useUI } from "./UIProvider";

export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const { openAgent } = useUI();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const query = q.toLowerCase().trim();
  const agents = AGENTS.filter((a) => !query || (a.n + a.t + a.cat + a.tag).toLowerCase().includes(query));
  const pages = PAGES.filter((p) => !query || p[0].toLowerCase().includes(query));
  const total = agents.length + pages.length;
  const cur = Math.min(sel, Math.max(0, total - 1));

  const go = (i: number) => {
    if (i >= total) return;
    onClose();
    if (i < agents.length) openAgent(agents[i].id);
    else scrollToSection(pages[i - agents.length][1]);
  };

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 20);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    listRef.current?.querySelector(".sel")?.scrollIntoView({ block: "nearest" });
  }, [cur, q]);

  // Arrow keys and Enter while the palette is open (Escape and ⌘K live in UIProvider).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setSel(Math.min(cur + 1, total - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSel(Math.max(cur - 1, 0)); }
      if (e.key === "Enter") { e.preventDefault(); go(cur); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  return (
    <div className="ck-bg on" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ck" role="dialog" aria-label="Search">
        <div className="ck-in">
          <SearchIcon size={18} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setSel(0); }}
            placeholder="Search agents, pages, actions…"
            autoComplete="off"
            aria-label="Search agents, pages, actions"
          />
        </div>
        <div className="ck-list" ref={listRef}>
          {total === 0 && <div className="ck-empty">No results. Try an agent name or ticker.</div>}
          {agents.length > 0 && <div className="ck-g">Agents</div>}
          {agents.map((a, i) => (
            <div key={a.id} className={`ck-i ${i === cur ? "sel" : ""}`} onMouseEnter={() => setSel(i)} onClick={() => go(i)}>
              <Avatar a={a} />
              <b>{a.n}</b>${a.t}
              <span className="r">{a.tr}%</span>
            </div>
          ))}
          {pages.length > 0 && <div className="ck-g">Go to</div>}
          {pages.map((p, j) => {
            const i = agents.length + j;
            return (
              <div key={p[1]} className={`ck-i ${i === cur ? "sel" : ""}`} onMouseEnter={() => setSel(i)} onClick={() => go(i)}>
                <span className="ck-ico">{p[2]}</span>
                <b>{p[0]}</b>
              </div>
            );
          })}
        </div>
        <div className="ck-foot">
          <span><kbd>↑↓</kbd>navigate</span>
          <span><kbd>↵</kbd>open</span>
          <span><kbd>esc</kbd>close</span>
        </div>
      </div>
    </div>
  );
}

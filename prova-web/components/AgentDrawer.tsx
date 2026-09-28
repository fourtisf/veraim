"use client";

import { useEffect, useRef } from "react";
import AgentPanel from "./AgentPanel";

export default function AgentDrawer({ slug, open, session, onClose }: { slug: string | null; open: boolean; session: number; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  // While closed the drawer sits off-screen: keep it out of the Tab order.
  useEffect(() => {
    if (drawerRef.current) drawerRef.current.inert = !open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => closeRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, [open, session]);

  return (
    <>
      <div className={`scrim ${open ? "on" : ""}`} onClick={onClose} />
      <aside ref={drawerRef} className={`drawer ${open ? "on" : ""}`} aria-hidden={!open} role="dialog" aria-label="Agent details">
        <button className="dx" ref={closeRef} onClick={onClose} aria-label="Close">✕</button>
        {/* keyed so each open starts fresh */}
        {slug && <AgentPanel key={`${slug}-${session}`} slug={slug} />}
      </aside>
    </>
  );
}

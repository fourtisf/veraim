"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import AgentDrawer from "./AgentDrawer";
import CommandPalette from "./CommandPalette";
import Toast from "./Toast";
import WaitlistModal, { type WaitlistSource } from "./WaitlistModal";

// Shared page state: toast, agent drawer, ⌘K palette, waitlist modal, watchlist and alerts.
type UI = {
  toast: (msg: string) => void;
  openAgent: (id: string) => void;
  openPalette: () => void;
  openWaitlist: (source: WaitlistSource, agentName?: string) => void;
  watch: Set<string>;
  alerts: Set<string>;
  toggleWatch: (id: string) => boolean;
  toggleAlert: (id: string) => boolean;
};

const Ctx = createContext<UI | null>(null);

export function useUI() {
  const ui = useContext(Ctx);
  if (!ui) throw new Error("useUI must be used inside <UIProvider>");
  return ui;
}

const toggled = (set: Set<string>, id: string) => {
  const next = new Set(set);
  next.has(id) ? next.delete(id) : next.add(id);
  return next;
};

export default function UIProvider({ children }: { children: ReactNode }) {
  const [toastMsg, setToastMsg] = useState("");
  const [toastOn, setToastOn] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const [agentId, setAgentId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [waitlist, setWaitlist] = useState<{ source: WaitlistSource; agentName?: string } | null>(null);
  const [watch, setWatch] = useState<Set<string>>(new Set());
  const [alerts, setAlerts] = useState<Set<string>>(new Set());

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastOn(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastOn(false), 2400);
  }, []);

  const openAgent = useCallback((id: string) => {
    setAgentId(id);
    setOpenCount((c) => c + 1); // fresh drawer state (tab, chat, free runs) on every open
    setDrawerOpen(true);
  }, []);

  const toggleWatch = useCallback((id: string) => {
    const on = !watch.has(id);
    setWatch((s) => toggled(s, id));
    return on;
  }, [watch]);

  const toggleAlert = useCallback((id: string) => {
    const on = !alerts.has(id);
    setAlerts((s) => toggled(s, id));
    return on;
  }, [alerts]);

  // ⌘K / Ctrl+K toggles the palette; Escape closes the drawer and modals.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (e.key === "Escape") {
        setDrawerOpen(false);
        setPaletteOpen(false);
        setWaitlist(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const ui = useMemo<UI>(
    () => ({
      toast,
      openAgent,
      openPalette: () => setPaletteOpen(true),
      openWaitlist: (source, agentName) => setWaitlist({ source, agentName }),
      watch,
      alerts,
      toggleWatch,
      toggleAlert,
    }),
    [toast, openAgent, watch, alerts, toggleWatch, toggleAlert]
  );

  return (
    <Ctx.Provider value={ui}>
      {children}
      <AgentDrawer session={openCount} agentId={agentId} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <Toast msg={toastMsg} on={toastOn} />
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
      {waitlist && <WaitlistModal {...waitlist} onClose={() => setWaitlist(null)} />}
    </Ctx.Provider>
  );
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, ApiError, signInWithWallet } from "@/lib/client";
import { activeProvider, clearActiveWallet, setActiveWallet, startDiscovery, type WalletOption } from "@/lib/walletProviders";
import type { Me } from "@/lib/types";
import AgentDrawer from "./AgentDrawer";
import CommandPalette from "./CommandPalette";
import Toast from "./Toast";
import WalletModal from "./WalletModal";
import WaitlistModal, { type WaitlistSource } from "./WaitlistModal";

// Shared state for every page: signed-in wallet, wallet picker, toast, agent drawer, ⌘K palette, waitlist modal.
type UI = {
  me: Me;
  meLoaded: boolean;
  refreshMe: () => Promise<void>;
  connect: () => Promise<boolean>;
  requireWallet: () => Promise<boolean>;
  signOut: () => Promise<void>;
  toast: (msg: string) => void;
  openAgent: (slug: string) => void;
  openPalette: () => void;
  openWaitlist: (source: WaitlistSource, agentName?: string) => void;
  toggleWatch: (slug: string) => Promise<void>;
  toggleAlert: (slug: string) => Promise<void>;
  dataVersion: number; // bumps when runs/launches change data, so lists refetch
  bumpData: () => void;
};

const Ctx = createContext<UI | null>(null);

export function useUI() {
  const ui = useContext(Ctx);
  if (!ui) throw new Error("useUI must be used inside <UIProvider>");
  return ui;
}

export default function UIProvider({ children }: { children: ReactNode }) {
  const [toastMsg, setToastMsg] = useState("");
  const [toastOn, setToastOn] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const [me, setMe] = useState<Me>(null);
  const [meLoaded, setMeLoaded] = useState(false);
  const [agentSlug, setAgentSlug] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [waitlist, setWaitlist] = useState<{ source: WaitlistSource; agentName?: string } | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [walletOpen, setWalletOpen] = useState(false);
  const connecting = useRef<Promise<boolean> | null>(null);
  const settle = useRef<((ok: boolean) => void) | null>(null);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastOn(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastOn(false), 3200);
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      setMe((await api<{ me: Me }>("/api/me")).me);
    } catch {}
    setMeLoaded(true);
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  useEffect(() => startDiscovery(), []);

  // Opens the wallet picker; resolves true once signed in, false if the picker is closed.
  const connect = useCallback(() => {
    connecting.current ??= new Promise<boolean>((resolve) => {
      settle.current = resolve;
      setWalletOpen(true);
    }).finally(() => {
      connecting.current = null;
    });
    return connecting.current;
  }, []);

  const closeWallet = useCallback((ok: boolean) => {
    setWalletOpen(false);
    settle.current?.(ok);
    settle.current = null;
  }, []);

  const pickWallet = useCallback(async (w: WalletOption) => {
    await signInWithWallet(w.provider);
    setActiveWallet(w);
    await refreshMe();
    toast(`Connected with ${w.name}`);
    closeWallet(true);
  }, [refreshMe, toast, closeWallet]);

  const requireWallet = useCallback(async () => !!me || connect(), [me, connect]);

  const signOut = useCallback(async () => {
    await api("/api/auth/logout", { body: {} }).catch(() => {});
    clearActiveWallet();
    setMe(null);
    toast("Signed out");
  }, [toast]);

  // Switching accounts in the wallet signs out, so actions never run as the wrong wallet.
  const myWallet = me?.wallet;
  useEffect(() => {
    const p = myWallet ? activeProvider() : null;
    if (!p?.on) return;
    const onAccounts = (accounts: string[]) => {
      if (!accounts[0] || accounts[0].toLowerCase() === myWallet!.toLowerCase()) return; // locked or same wallet
      signOut().then(() => toast("Wallet changed. Connect again to continue."));
    };
    p.on("accountsChanged", onAccounts);
    return () => p.removeListener?.("accountsChanged", onAccounts);
  }, [myWallet, signOut, toast]);

  const openAgent = useCallback((slug: string) => {
    setAgentSlug(slug);
    setOpenCount((c) => c + 1); // fresh drawer state (tab, chat) on every open
    setDrawerOpen(true);
  }, []);

  const toggleWatch = useCallback(async (slug: string) => {
    if (!(await requireWallet())) return;
    try {
      const { on } = await api<{ on: boolean }>(`/api/agents/${slug}/watch`, { body: {} });
      setMe((m) => m && { ...m, watch: on ? [...m.watch, slug] : m.watch.filter((s) => s !== slug) });
      toast(on ? "Added to watchlist" : "Removed from watchlist");
    } catch (err) {
      toast((err as Error).message);
    }
  }, [requireWallet, toast]);

  const toggleAlert = useCallback(async (slug: string) => {
    if (!(await requireWallet())) return;
    try {
      const { on, linkUrl } = await api<{ on: boolean; linkUrl?: string | null }>(`/api/agents/${slug}/alert`, { body: {} });
      setMe((m) => m && { ...m, alerts: on ? [...m.alerts, slug] : m.alerts.filter((s) => s !== slug) });
      if (on && linkUrl) {
        window.open(linkUrl, "_blank", "noopener");
        toast("Alerts on. Press Start in Telegram to finish linking");
      } else toast(on ? "Alerts on. Every new call goes to Telegram" : "Alerts off");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't update alerts");
    }
  }, [requireWallet, toast]);

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
        if (settle.current) closeWallet(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeWallet]);

  const ui = useMemo<UI>(
    () => ({
      me,
      meLoaded,
      refreshMe,
      connect,
      requireWallet,
      signOut,
      toast,
      openAgent,
      openPalette: () => setPaletteOpen(true),
      openWaitlist: (source, agentName) => setWaitlist({ source, agentName }),
      toggleWatch,
      toggleAlert,
      dataVersion,
      bumpData: () => setDataVersion((v) => v + 1),
    }),
    [me, meLoaded, refreshMe, connect, requireWallet, signOut, toast, openAgent, toggleWatch, toggleAlert, dataVersion]
  );

  return (
    <Ctx.Provider value={ui}>
      {children}
      <AgentDrawer session={openCount} slug={agentSlug} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <Toast msg={toastMsg} on={toastOn} />
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
      {walletOpen && <WalletModal onPick={pickWallet} onClose={() => closeWallet(false)} />}
      {waitlist && <WaitlistModal {...waitlist} onClose={() => setWaitlist(null)} />}
    </Ctx.Provider>
  );
}

"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/client";
import type { AgentView, CallView, SiteStats } from "@/lib/types";
import { useUI } from "./UIProvider";

export type HomeData = { agents: AgentView[]; calls: CallView[]; stats: SiteStats; nextGradeAt: string | null; lastGraded: CallView | null };

const Ctx = createContext<HomeData | null>(null);

export function useHome() {
  const d = useContext(Ctx);
  if (!d) throw new Error("useHome must be used inside <HomeDataProvider>");
  return d;
}

// Live data for the home page: rendered on the server, then refreshed in the browser.
export default function HomeDataProvider({ initial, children }: { initial: HomeData; children: ReactNode }) {
  const { dataVersion } = useUI();
  const [data, setData] = useState(initial);

  useEffect(() => {
    let stop = false;
    const refresh = async () => {
      if (document.hidden) return;
      try {
        const r = await api<{ calls: CallView[]; stats: SiteStats; nextGradeAt: string | null }>("/api/calls");
        if (!stop) setData((d) => ({ ...d, ...r, lastGraded: r.calls.find((c) => c.status === "hit" || c.status === "miss") || d.lastGraded }));
      } catch {}
    };
    const id = setInterval(refresh, 5000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let stop = false;
    const refresh = async () => {
      try {
        const r = await api<{ agents: AgentView[] }>("/api/agents");
        if (!stop) setData((d) => ({ ...d, agents: r.agents }));
      } catch {}
    };
    if (dataVersion) refresh();
    const id = setInterval(refresh, 30_000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [dataVersion]);

  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

"use client";

import { useState } from "react";
import { api } from "@/lib/client";

export default function AdminAgentToggle({ id, hidden: initial }: { id: string; hidden: boolean }) {
  const [hidden, setHidden] = useState(initial);
  const toggle = async () => {
    await api("/api/admin/agents", { body: { id, hidden: !hidden } });
    setHidden(!hidden);
  };
  return <button className="cpy" onClick={toggle}>{hidden ? "Show" : "Hide"}</button>;
}

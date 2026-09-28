"use client";

import { useRef, useState, type MouseEvent } from "react";
import { SITE, shortAddress } from "@/config/site";
import { copyText } from "@/lib/clipboard";
import { CopyIcon } from "./icons";
import { useUI } from "./UIProvider";

// Every contract-address box on the site. Reads SITE.contractAddress:
// empty shows "Coming soon" (and copies that text), set shows 0xABCD…1234 and copies the full address.
export default function CaButton({ variant = "box", onCopied }: { variant?: "box" | "menu"; onCopied?: () => void }) {
  const { toast } = useUI();
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const ca = SITE.contractAddress.trim();

  const copy = (e: MouseEvent) => {
    e.preventDefault();
    copyText(ca || "Coming soon").then(() => {
      setDone(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setDone(false), 1600);
      toast(ca ? "Contract address copied" : "Copied: CA coming soon. Follow X for the launch");
      onCopied?.();
    });
  };

  if (variant === "menu") {
    return (
      <a href="#" onClick={copy} className={done ? "done" : ""}>
        Contract address <span className="cav">{ca ? shortAddress(ca) : "Coming soon · tap to copy"}</span>
      </a>
    );
  }

  return (
    <button className={`ca ${done ? "done" : ""}`} onClick={copy} aria-label="Copy contract address">
      CA<span className={`cav ${ca ? "" : "soon"}`}>{ca ? shortAddress(ca) : "Coming soon"}</span>
      <span className="cpi"><CopyIcon /></span>
    </button>
  );
}

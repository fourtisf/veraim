"use client";

import { SITE, X_HANDLE } from "@/config/site";
import CaButton from "./CaButton";

const LINKS: [string, string, string?][] = [
  ["#tour", "All features", "8"],
  ["#agents", "Leaderboard", "Agents"],
  ["#live", "Live calls", "Feed"],
  ["#compare", "Compare", "Head to head"],
  ["#earn", "Earnings calculator", "Earn"],
  ["#build", "Build an agent", "4 steps"],
  ["#api", "Developer API", "Code"],
  ["#faq", "FAQ"],
];

export default function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div className={`mnav ${open ? "on" : ""}`} id="mnav">
      {LINKS.map(([href, label, note]) => (
        <a key={href} href={href} onClick={onClose}>
          {label} {note && <span>{note}</span>}
        </a>
      ))}
      <a href={SITE.xUrl} target="_blank" rel="noopener" onClick={onClose}>
        Follow on X <span>{X_HANDLE}</span>
      </a>
      <CaButton variant="menu" onCopied={onClose} />
    </div>
  );
}

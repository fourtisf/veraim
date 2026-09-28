"use client";

import { shortHash } from "@/lib/format";
import { useHome } from "./HomeData";
import { CheckIcon } from "./icons";

// Floating card over the product window: the latest graded call, or how grading works.
export default function VerifiedCard() {
  const { lastGraded: c, agents } = useHome();
  if (!c) {
    return (
      <div className="toastcard" role="status">
        <div className="tc-top"><span className="check"><CheckIcon /></span><b>How a call is verified</b></div>
        <p>Every call is <strong>hashed and sealed onchain</strong> before the outcome is known. At the deadline it&apos;s graded <strong>Hit</strong> or <strong>Miss</strong> from market data.</p>
        <div className="tc-foot"><span>Graded after</span><b>24h · 7d</b></div>
      </div>
    );
  }
  const agent = agents.find((a) => a.slug === c.agent.slug);
  const hit = c.status === "hit";
  return (
    <div className="toastcard" role="status">
      <div className="tc-top">
        <span className="check"><CheckIcon /></span>
        <b>Call verified · {hit ? "Hit" : "Miss"}</b>
        {c.claimHash && <span className="addr">{shortHash(c.claimHash)}</span>}
      </div>
      <p>
        <strong>{c.agent.name}</strong> called <strong>{c.label}</strong>{c.subject && <> on <strong>{shortHash(c.subject)}</strong></>}.
        {c.priceChangePct !== null && <> Price since: <strong style={{ color: c.priceChangePct < 0 ? "var(--miss)" : "var(--hit)" }}>{c.priceChangePct > 0 ? "+" : ""}{c.priceChangePct}%</strong>.</>}
      </p>
      <div className="tc-foot"><span>Track record</span><b>{agent?.trackRecord !== null && agent?.trackRecord !== undefined ? `${agent.trackRecord}%` : "—"} · {agent?.graded ?? 0} graded</b></div>
    </div>
  );
}

import type { ReactNode } from "react";

export default function LegalPage({ kicker, title, updated, children }: { kicker: string; title: string; updated?: string; children: ReactNode }) {
  return (
    <main className="page">
      <div className="wrap">
        <div className="page-head">
          <span className="kicker">{kicker}</span>
          <h1>{title}</h1>
          {updated && <p>Last updated {updated}</p>}
        </div>
        <div className="prose">{children}</div>
      </div>
    </main>
  );
}

import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/ogFonts";
import { agentViews } from "@/lib/server/views";

export const alt = "Prova agent";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

// Share card for an agent: name, tagline and its real record.
export default async function AgentOg({ params }: { params: { slug: string } }) {
  const [a] = await agentViews({ slug: params.slug, hidden: false });
  const name = a?.name || "Agent not found";
  const [c1, c2] = a?.colors || ["#F4E6CC", "#9C8158"];
  const stat = (label: string, value: string, gold = false) => (
    <div style={{ display: "flex", flexDirection: "column", padding: "22px 28px", borderLeft: "1px solid rgba(255,255,255,.08)", flex: 1 }}>
      <div style={{ display: "flex", fontSize: 20, color: "#7E7E88" }}>{label}</div>
      <div style={{ display: "flex", fontSize: 48, fontWeight: 600, letterSpacing: "-0.04em", color: gold ? "#E2CDA6" : "#EDEDEF", marginTop: 6 }}>{value}</div>
    </div>
  );
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#000", color: "#EDEDEF", fontFamily: "Geist", padding: 64, position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: -300, width: 1200, height: 800, display: "flex", background: "radial-gradient(ellipse 45% 45% at 50% 40%, rgba(226,205,166,.18), transparent 70%)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 26, fontWeight: 600 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, display: "flex", background: "linear-gradient(145deg,#F4E6CC,#9C8158)" }}>
            <svg width="34" height="34" viewBox="0 0 64 64"><polyline points="16.13,28.56 25.56,37.98 42.53,21.01" fill="none" stroke="#0A0A0A" strokeWidth="5.33" /></svg>
          </div>
          Prova
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 28, marginTop: 70 }}>
          <div style={{ width: 110, height: 110, borderRadius: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52, fontWeight: 600, color: "#fff", background: `radial-gradient(circle at 30% 20%, ${c1}, ${c2})` }}>{name[0]}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 76, fontWeight: 600, letterSpacing: "-0.05em", lineHeight: 1 }}>{name}</div>
            <div style={{ display: "flex", fontSize: 28, color: "#A0A0A8", marginTop: 14 }}>{a?.tagline || ""}</div>
          </div>
        </div>
        <div style={{ display: "flex", marginTop: "auto", borderRadius: 20, border: "1px solid rgba(255,255,255,.1)", background: "#070708" }}>
          {stat("Track record", a?.ranked ? `${Math.round(a.trackRecord || 0)}%` : "Building", true)}
          {stat("Graded calls", String(a?.graded ?? 0))}
          {stat("Sealed on", "Robinhood Chain")}
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() }
  );
}

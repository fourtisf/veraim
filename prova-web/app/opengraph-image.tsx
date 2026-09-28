import { ImageResponse } from "next/og";
import { AGENTS } from "@/lib/mock";
import { ogFonts } from "@/lib/ogFonts";

export const alt = "Prova — AI agents, ranked by proof.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Dark card: logo, headline and a slice of the leaderboard product window.
export default async function OgImage() {
  const top = [...AGENTS].sort((x, y) => y.tr - x.tr).slice(0, 3);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", background: "#000", color: "#EDEDEF", fontFamily: "Geist", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: -260, width: 1200, height: 800, display: "flex", background: "radial-gradient(ellipse 45% 45% at 50% 40%, rgba(226,205,166,.22), transparent 70%)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 56, fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em" }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(145deg,#F4E6CC,#9C8158)" }}>
            <svg width="40" height="40" viewBox="0 0 64 64"><polyline points="16.13,28.56 25.56,37.98 42.53,21.01" fill="none" stroke="#0A0A0A" strokeWidth="5.33" /></svg>
          </div>
          Prova
        </div>
        <div style={{ display: "flex", fontSize: 82, fontWeight: 600, letterSpacing: "-0.055em", lineHeight: 1, marginTop: 30, backgroundImage: "linear-gradient(180deg,#fff 35%,rgba(255,255,255,.6))", backgroundClip: "text", color: "transparent" }}>
          AI agents, ranked by proof.
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#A0A0A8", marginTop: 20 }}>Every call sealed onchain before the result is known.</div>

        <div style={{ display: "flex", flexDirection: "column", width: 900, marginTop: 44, borderRadius: 18, background: "linear-gradient(180deg,#0F0F12,#060607)", border: "1px solid rgba(255,255,255,.1)", boxShadow: "0 30px 100px -30px rgba(226,205,166,.35)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", height: 46, padding: "0 18px", gap: 8, borderBottom: "1px solid rgba(255,255,255,.06)" }}>
            {[0, 1, 2].map((i) => <div key={i} style={{ width: 11, height: 11, borderRadius: 11, background: "#1C1C20", border: "1px solid rgba(255,255,255,.1)" }} />)}
            <div style={{ display: "flex", margin: "0 auto", fontFamily: "Geist Mono", fontSize: 15, color: "#62626B", background: "#0D0D0F", padding: "4px 16px", borderRadius: 8 }}>prova.live/leaderboard</div>
          </div>
          {top.map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", padding: "16px 28px", borderTop: "1px solid rgba(255,255,255,.06)", fontSize: 22 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 600, color: "#fff", background: `radial-gradient(circle at 30% 20%, ${a.c[0]}, ${a.c[1]})` }}>{a.n[0]}</div>
              <div style={{ display: "flex", marginLeft: 16, width: 300 }}>{a.n}</div>
              <div style={{ display: "flex", width: 260, height: 6, borderRadius: 6, background: "#1C1C20", marginRight: 18 }}>
                <div style={{ width: `${a.tr}%`, height: 6, borderRadius: 6, background: "linear-gradient(90deg,#BFA57A,#E2CDA6)" }} />
              </div>
              <div style={{ display: "flex", width: 70 }}>{a.tr}%</div>
              <div style={{ display: "flex", marginLeft: "auto", fontFamily: "Geist Mono", fontSize: 16, color: "#62626B" }}>{a.g} graded</div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() }
  );
}

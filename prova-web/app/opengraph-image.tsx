import { ImageResponse } from "next/og";
import LogoMark from "@/components/LogoMark";
import { ogFonts } from "@/lib/ogFonts";

export const alt = "Veraim — AI agents, ranked by proof.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Dark card: logo, headline and a slice of the leaderboard product window.
export default async function OgImage() {
  // Veraim's official starter agents. No numbers here: records are live on the site.
  const top = [
    { id: "hound", n: "Veraim Safety Agent", c: ["#8FA3FF", "#2B3A9E"], call: "BUNDLED", grade: "graded in 24h" },
    { id: "tide", n: "Veraim Whale Agent", c: ["#7FE3B4", "#146B48"], call: "LONG · 7d", grade: "graded in 7d" },
    { id: "dev", n: "Veraim Dev Agent", c: ["#FF9AAE", "#8E2238"], call: "SERIAL RUGGER", grade: "graded in 24h" },
  ];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", background: "#000", color: "#EDEDEF", fontFamily: "Geist", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: -260, width: 1200, height: 800, display: "flex", background: "radial-gradient(ellipse 45% 45% at 50% 40%, rgba(226,205,166,.22), transparent 70%)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 56, fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em" }}>
          <LogoMark size={40} color="#FFFFFF" />
          Veraim
        </div>
        <div style={{ display: "flex", fontSize: 82, fontWeight: 600, letterSpacing: "-0.055em", lineHeight: 1, marginTop: 30, backgroundImage: "linear-gradient(180deg,#fff 35%,rgba(255,255,255,.6))", backgroundClip: "text", color: "transparent" }}>
          AI agents, ranked by proof.
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#A0A0A8", marginTop: 20 }}>Every call sealed onchain before the result is known.</div>

        <div style={{ display: "flex", flexDirection: "column", width: 900, marginTop: 44, borderRadius: 18, background: "linear-gradient(180deg,#0F0F12,#060607)", border: "1px solid rgba(255,255,255,.1)", boxShadow: "0 30px 100px -30px rgba(226,205,166,.35)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", height: 46, padding: "0 18px", gap: 8, borderBottom: "1px solid rgba(255,255,255,.06)" }}>
            {[0, 1, 2].map((i) => <div key={i} style={{ width: 11, height: 11, borderRadius: 11, background: "#1C1C20", border: "1px solid rgba(255,255,255,.1)" }} />)}
            <div style={{ display: "flex", margin: "0 auto", fontFamily: "Geist Mono", fontSize: 15, color: "#62626B", background: "#0D0D0F", padding: "4px 16px", borderRadius: 8 }}>veraim.xyz/leaderboard</div>
          </div>
          {top.map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", padding: "16px 28px", borderTop: "1px solid rgba(255,255,255,.06)", fontSize: 22 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 600, color: "#fff", background: `radial-gradient(circle at 30% 20%, ${a.c[0]}, ${a.c[1]})` }}>{a.n[0]}</div>
              <div style={{ display: "flex", marginLeft: 16, width: 300 }}>{a.n}</div>
              <div style={{ display: "flex", fontFamily: "Geist Mono", fontSize: 17, color: "#E2CDA6", padding: "4px 12px", borderRadius: 8, background: "rgba(226,205,166,.08)" }}>{a.call}</div>
              <div style={{ display: "flex", marginLeft: "auto", fontFamily: "Geist Mono", fontSize: 16, color: "#7E7E88" }}>sealed onchain · {a.grade}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() }
  );
}

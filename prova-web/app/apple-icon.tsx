import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon: the gold check mark on black.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#000" }}>
        <div style={{ width: 128, height: 128, borderRadius: 37, display: "flex", background: "linear-gradient(145deg,#F4E6CC,#9C8158)" }}>
          <svg width="128" height="128" viewBox="0 0 64 64"><polyline points="16.13,28.56 25.56,37.98 42.53,21.01" fill="none" stroke="#0A0A0A" strokeWidth="5.33" /></svg>
        </div>
      </div>
    ),
    size
  );
}

import { ImageResponse } from "next/og";
import LogoMark from "@/components/LogoMark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon: the white Veraim mark on black.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#000" }}>
        <LogoMark size={118} color="#FFFFFF" />
      </div>
    ),
    size
  );
}

import { ImageResponse } from "next/og";
import { SITE_TAGLINE } from "@/lib/marketing-data";

export const alt = `Zuttoo — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0b1120",
          color: "#e6ecf4",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: "#2dd4bf" }} />
          <div style={{ fontSize: 28, color: "#9aa8bd", letterSpacing: 2 }}>ZUTTOO PRODUCT SUITE</div>
        </div>
        <div style={{ marginTop: 36, fontSize: 84, fontWeight: 700, lineHeight: 1.05, maxWidth: 900 }}>
          AI products for real-world operations.
        </div>
        <div style={{ marginTop: 40, display: "flex", gap: 28, fontSize: 30, color: "#9aa8bd" }}>
          <span>AssetIQ</span>
          <span style={{ color: "#223050" }}>·</span>
          <span>GridSense</span>
          <span style={{ color: "#223050" }}>·</span>
          <span>SolarIQ</span>
          <span style={{ color: "#223050" }}>·</span>
          <span>WindIQ</span>
        </div>
      </div>
    ),
    { ...size }
  );
}

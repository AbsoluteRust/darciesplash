import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "The Commissioner's Collection";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 50% 30%, #2a1a4a 0%, #0a0713 60%, #05050c 100%)",
          color: "#f8f5ff",
          padding: "60px",
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#9a7bff",
            marginBottom: 24,
            display: "flex",
          }}
        >
          Darcie Splash
        </div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: -3,
            lineHeight: 1.05,
            textAlign: "center",
            display: "flex",
            background: "linear-gradient(to bottom, #ffffff, #6f6fbe)",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          The Commissioner's Collection
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#a09bc0",
            marginTop: 32,
            display: "flex",
          }}
        >
          Emotes · Splash Art · Wallpapers · Stickers
        </div>
      </div>
    ),
    { ...size }
  );
}
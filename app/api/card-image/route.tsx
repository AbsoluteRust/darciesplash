import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

const RARITY_COLORS: Record<string, string> = {
  Common: "#9ca3af",
  Uncommon: "#22c55e",
  Rare: "#3b82f6",
  Epic: "#a855f7",
  Legendary: "#eab308",
  Mythic: "#ef4444",
};

async function compressImage(url: string, maxWidth = 800): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());

    const out = await sharp(buf)
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();

    return `data:image/webp;base64,${out.toString("base64")}`;
  } catch (err) {
    console.error("[card-image] compress failed:", err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") || "Unknown Card";
  const type = searchParams.get("type") || "Emote";
  const rarity = searchParams.get("rarity") || "";
  const collection = searchParams.get("collection") || "";
  let image = searchParams.get("image") || "";
  const rarityColor = RARITY_COLORS[rarity] || "#9ca3af";

  if (image && !image.startsWith("http")) {
    const origin = new URL(req.url).origin;
    image = image.startsWith("/") ? `${origin}${image}` : `${origin}/${image}`;
  }

  const compressedImage = image ? await compressImage(image) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `radial-gradient(circle at 50% 0%, ${rarityColor}33, #05050c 60%)`,
          padding: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            borderRadius: 28,
            overflow: "hidden",
            background: "#0a0a14",
            border: `3px solid ${rarityColor}`,
            boxShadow: `0 0 40px ${rarityColor}55`,
          }}
        >
          {compressedImage ? (
            <img
              src={compressedImage}
              alt=""
              style={{
                width: "100%",
                height: 320,
                objectFit: "cover",
                display: "flex",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: 320,
                background: "#1a1a2e",
                display: "flex",
              }}
            />
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: 24,
              gap: 8,
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: 34,
                fontWeight: 800,
                color: "#ffffff",
                lineHeight: 1.05,
                display: "flex",
              }}
            >
              {name}
            </div>
            <div style={{ fontSize: 18, color: "#a0a0c0", display: "flex" }}>
              {type}
            </div>

            <div style={{ display: "flex", flex: 1 }} />

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {rarity && (
                <div
                  style={{
                    display: "flex",
                    padding: "6px 14px",
                    borderRadius: 999,
                    background: rarityColor,
                    color: "#000000",
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  {rarity}
                </div>
              )}
              {collection && (
                <div
                  style={{
                    fontSize: 14,
                    color: "#707090",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    display: "flex",
                  }}
                >
                  {collection}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 400,
      height: 560,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    }
  );
}
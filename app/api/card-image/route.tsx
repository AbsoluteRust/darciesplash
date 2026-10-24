import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import sharp from "sharp";

// Switch from edge to nodejs so we can use sharp
export const runtime = "nodejs";

const RARITY_COLORS: Record<string, string> = {
  Common: "#9ca3af",
  Uncommon: "#22c55e",
  Rare: "#3b82f6",
  Epic: "#a855f7",
  Legendary: "#eab308",
  Mythic: "#ef4444",
};

// ---------- SSRF protection ----------

const ALLOWED_IMAGE_HOSTS: Set<string> = (() => {
  const hosts = new Set<string>();
  const add = (raw: string | undefined) => {
    if (!raw) return;
    try {
      hosts.add(new URL(raw).hostname.toLowerCase());
    } catch {}
  };
  add(process.env.R2_PUBLIC_URL);
  add(process.env.NEXT_PUBLIC_SITE_URL);
  add(process.env.SITE_BASE_URL);
  return hosts;
})();

const FETCH_TIMEOUT_MS = 8000;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_URL_LENGTH = 2048;

function resolveSafeImageUrl(raw: string, origin: string): URL | null {
  if (!raw || raw.length > MAX_URL_LENGTH) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw, origin);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;

  const host = parsed.hostname.toLowerCase();
  let requestHost = "";
  try {
    requestHost = new URL(origin).hostname.toLowerCase();
  } catch {}

  // Same-origin (relative paths, or absolute URLs pointing at the site itself)
  if (requestHost && host === requestHost) return parsed;

  // Cross-origin: must be explicitly allowlisted (e.g. R2 CDN)
  if (ALLOWED_IMAGE_HOSTS.has(host)) return parsed;

  return null;
}

async function fetchImageBuffer(url: URL): Promise<Buffer | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "manual",
      cache: "no-store",
      headers: { Accept: "image/*" },
    });

    // Explicitly reject redirects (fetch with redirect: "manual" leaves 3xx as-is)
    if (res.status >= 300 && res.status < 400) return null;
    if (!res.ok) return null;

    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (!ct.startsWith("image/")) return null;

    const cl = Number(res.headers.get("content-length") || 0);
    if (cl > MAX_IMAGE_BYTES) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_IMAGE_BYTES) return null;
    return buf;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- handler ----------

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") || "Unknown Card";
  const type = searchParams.get("type") || "Emote";
  const rarity = searchParams.get("rarity") || "";
  const collection = searchParams.get("collection") || "";
  const image = searchParams.get("image") || "";

  // Use the configured site URL as origin so a spoofed Host header can't
  // redirect relative-path resolution. Falls back to req.url origin for dev.
  let origin: string;
  try {
    origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  } catch {
    origin = "http://localhost:3000";
  }

  let imageUrl = "";
  if (image) {
    const safe = resolveSafeImageUrl(image, origin);
    if (safe) {
      const buf = await fetchImageBuffer(safe);
      if (buf) {
        try {
          const pngBuffer = await sharp(buf).png().toBuffer();
          imageUrl = `data:image/png;base64,${pngBuffer.toString("base64")}`;
        } catch (err) {
          console.error("[card-image] sharp conversion failed:", err);
        }
      } else {
        console.warn("[card-image] image fetch failed:", safe.toString());
      }
    } else {
      console.warn("[card-image] rejected unsafe image URL:", image.slice(0, 200));
    }
  }

  const rarityColor = RARITY_COLORS[rarity] || "#9ca3af";

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
          {imageUrl ? (
            <img
              src={imageUrl}
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
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    }
  );
}
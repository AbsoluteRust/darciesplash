import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import sharp from "sharp";

// Node runtime for sharp + gifenc.
export const runtime = "nodejs";

const RARITY_COLORS: Record<string, string> = {
  Common: "#9ca3af",
  Uncommon: "#22c55e",
  Rare: "#3b82f6",
  Epic: "#a855f7",
  Legendary: "#eab308",
  Mythic: "#ef4444",
};

const CARD_W = 400;
const CARD_H = 560;
const PADDING = 20;
const BORDER = 3;
const EMOTE_H = 320;
const EMOTE_X = PADDING + BORDER;
const EMOTE_Y = PADDING + BORDER;
const EMOTE_W = CARD_W - 2 * (PADDING + BORDER);

// Lazily loaded so a broken gifenc doesn't take down the whole route.
let _gifencPromise: Promise<any> | null = null;
function loadGifenc(): Promise<any> {
  if (!_gifencPromise) {
    _gifencPromise = import("gifenc");
  }
  return _gifencPromise;
}

function isGifUrl(url: string): boolean {
  return /\.gif(\?|$)/i.test(url);
}

async function fetchAsBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function compressImage(url: string, maxWidth = 800): Promise<string | null> {
  const buf = await fetchAsBuffer(url);
  if (!buf) return null;
  try {
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

async function renderFrame(opts: {
  name: string;
  type: string;
  rarity: string;
  collection: string;
  rarityColor: string;
  compressedImage: string | null;
}): Promise<Buffer> {
  const { name, type, rarity, collection, rarityColor, compressedImage } = opts;

  const response = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `radial-gradient(circle at 50% 0%, ${rarityColor}33, #05050c 60%)`,
          padding: PADDING,
          boxSizing: "border-box",
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
            border: `${BORDER}px solid ${rarityColor}`,
            boxShadow: `0 0 40px ${rarityColor}55`,
            boxSizing: "border-box",
          }}
        >
          {compressedImage ? (
            <img
              src={compressedImage}
              alt=""
              style={{ width: "100%", height: EMOTE_H, objectFit: "cover", display: "flex" }}
            />
          ) : (
            <div style={{ width: "100%", height: EMOTE_H, background: "#1a1a2e", display: "flex" }} />
          )}
          <div style={{ display: "flex", flexDirection: "column", padding: 24, gap: 8, flex: 1 }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: "#ffffff", lineHeight: 1.05, display: "flex" }}>
              {name}
            </div>
            <div style={{ fontSize: 18, color: "#a0a0c0", display: "flex" }}>{type}</div>
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
    { width: CARD_W, height: CARD_H }
  );

  return Buffer.from(await response.arrayBuffer());
}

async function renderAnimatedCard(gifBuffer: Buffer, frameBuffer: Buffer): Promise<Buffer> {
  const { GIFEncoder, quantize, applyPalette } = await loadGifenc();

  const meta = await sharp(gifBuffer, { animated: true }).metadata();
  const pages = Math.max(1, meta.pages || 1);
  const delayPerPage = Array.isArray(meta.delay) ? meta.delay : [];

  const frameRaw = await sharp(frameBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (frameRaw.info.width !== CARD_W || frameRaw.info.height !== CARD_H) {
    throw new Error(`frame size mismatch: ${frameRaw.info.width}x${frameRaw.info.height}`);
  }
  const frameData = frameRaw.data;

  const gif = GIFEncoder();

  for (let i = 0; i < pages; i++) {
    const pageRgba = await sharp(gifBuffer, { page: i })
      .resize(EMOTE_W, EMOTE_H, { fit: "cover", position: "center" })
      .ensureAlpha()
      .raw()
      .toBuffer();

    const out = Buffer.from(frameData);
    const rowBytes = EMOTE_W * 4;
    for (let y = 0; y < EMOTE_H; y++) {
      const srcOff = y * rowBytes;
      const dstOff = ((EMOTE_Y + y) * CARD_W + EMOTE_X) * 4;
      pageRgba.copy(out, dstOff, srcOff, srcOff + rowBytes);
    }

    const rgba = new Uint8ClampedArray(out.buffer, out.byteOffset, out.byteLength);
    const palette = quantize(rgba, 256);
    const index = applyPalette(rgba, palette);

    const delayMs = delayPerPage[i] ?? 100;
    const delayCs = Math.max(2, Math.round(delayMs / 10));

    gif.writeFrame(index, CARD_W, CARD_H, { palette, delay: delayCs });
  }

  gif.finish();
  return Buffer.from(gif.bytes());
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name") || "Unknown Card";
    const type = searchParams.get("type") || "Emote";
    const rarity = searchParams.get("rarity") || "";
    const collection = searchParams.get("collection") || "";
    let image = searchParams.get("image") || "";
    const allowAnimated = searchParams.get("allow_animated") === "1";
    const rarityColor = RARITY_COLORS[rarity] || "#9ca3af";

    if (image && !image.startsWith("http")) {
      const origin = new URL(req.url).origin;
      image = image.startsWith("/") ? `${origin}${image}` : `${origin}/${image}`;
    }

    if (allowAnimated && isGifUrl(image)) {
      try {
        const [frameBuffer, gifBuffer] = await Promise.all([
          renderFrame({ name, type, rarity, collection, rarityColor, compressedImage: null }),
          fetchAsBuffer(image),
        ]);

        if (gifBuffer) {
          const animated = await renderAnimatedCard(gifBuffer, frameBuffer);
          return new Response(new Uint8Array(animated), {
            headers: {
              "Content-Type": "image/gif",
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        }
      } catch (err) {
        console.error("[card-image] animated render failed, falling back to static:", err);
      }
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
                style={{ width: "100%", height: 320, objectFit: "cover", display: "flex" }}
              />
            ) : (
              <div style={{ width: "100%", height: 320, background: "#1a1a2e", display: "flex" }} />
            )}
            <div style={{ display: "flex", flexDirection: "column", padding: 24, gap: 8, flex: 1 }}>
              <div style={{ fontSize: 34, fontWeight: 800, color: "#ffffff", lineHeight: 1.05, display: "flex" }}>
                {name}
              </div>
              <div style={{ fontSize: 18, color: "#a0a0c0", display: "flex" }}>{type}</div>
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
        headers: { "Cache-Control": "public, max-age=31536000, immutable" },
      }
    );
  } catch (err) {
    console.error("[card-image] fatal error:", err);
    return new Response("Card render failed", { status: 500 });
  }
}
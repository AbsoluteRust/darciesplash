import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import sharp from "sharp";
import { GIFEncoder, quantize, applyPalette } from "gifenc";

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

// Card layout constants — must match the JSX below.
const CARD_W = 400;
const CARD_H = 560;
const PADDING = 20;               // outer padding on the root div
const BORDER = 3;                 // border on the inner card
const EMOTE_H = 320;              // height of the emote <img> slot
const EMOTE_X = PADDING + BORDER; // emote slot origin X (content area of inner div)
const EMOTE_Y = PADDING + BORDER; // emote slot origin Y
const EMOTE_W = CARD_W - 2 * (PADDING + BORDER); // full width of the slot

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

// Render the card frame to a PNG buffer. When `compressedImage` is null the
// emote slot renders as an empty placeholder; the caller composites an
// animated emote over it.
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
              style={{
                width: "100%",
                height: EMOTE_H,
                objectFit: "cover",
                display: "flex",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: EMOTE_H,
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
    { width: CARD_W, height: CARD_H }
  );

  return Buffer.from(await response.arrayBuffer());
}

// Composite an animated emote into the frame's emote slot, frame by frame,
// and re-encode as a looping GIF.
async function renderAnimatedCard(
  gifBuffer: Buffer,
  frameBuffer: Buffer
): Promise<Buffer> {
  const meta = await sharp(gifBuffer, { animated: true }).metadata();
  const pages = Math.max(1, meta.pages || 1);
  const delayPerPage = Array.isArray(meta.delay) ? meta.delay : [];

  // Pre-render the frame's raw RGBA once so we can stamp it per page.
  const frameRaw = await sharp(frameBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (frameRaw.info.width !== CARD_W || frameRaw.info.height !== CARD_H) {
    throw new Error(
      `frame size mismatch: ${frameRaw.info.width}x${frameRaw.info.height}`
    );
  }

  const frameData = frameRaw.data; // RGBA, CARD_W * CARD_H * 4

  const gif = GIFEncoder();

  for (let i = 0; i < pages; i++) {
    // Extract page i (fully composited by sharp, disposal handled) and
    // resize it to cover the emote slot exactly.
    const pageRgba = await sharp(gifBuffer, { page: i })
      .resize(EMOTE_W, EMOTE_H, { fit: "cover", position: "center" })
      .ensureAlpha()
      .raw()
      .toBuffer();

    // Copy the frame, then stamp the emote page into the slot region.
    const out = Buffer.from(frameData);
    const rowBytes = EMOTE_W * 4;
    for (let y = 0; y < EMOTE_H; y++) {
      const srcOff = y * rowBytes;
      const dstOff = ((EMOTE_Y + y) * CARD_W + EMOTE_X) * 4;
      pageRgba.copy(out, dstOff, srcOff, srcOff + rowBytes);
    }

    const rgba = new Uint8ClampedArray(
      out.buffer,
      out.byteOffset,
      out.byteLength
    );

    const palette = quantize(rgba, 256);
    const index = applyPalette(rgba, palette);

    const delayMs = delayPerPage[i] ?? 100;
    const delayCs = Math.max(2, Math.round(delayMs / 10)); // GIF is centiseconds

    gif.writeFrame(index, CARD_W, CARD_H, { palette, delay: delayCs });
  }

  gif.finish();
  return Buffer.from(gif.bytes());
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") || "Unknown Card";
  const type = searchParams.get("type") || "Emote";
  const rarity = searchParams.get("rarity") || "";
  const collection = searchParams.get("collection") || "";
  let image = searchParams.get("image") || "";
  const allowAnimated = searchParams.get("allow_animated") === "1";
  const rarityColor = RARITY_COLORS[rarity] || "#9ca3af";

  // Make relative paths absolute (source on this site)
  if (image && !image.startsWith("http")) {
    const origin = new URL(req.url).origin;
    image = image.startsWith("/") ? `${origin}${image}` : `${origin}/${image}`;
  }

  // Animated path: only when the caller opted in and the source is a GIF.
  if (allowAnimated && isGifUrl(image)) {
    try {
      const [frameBuffer, gifBuffer] = await Promise.all([
        renderFrame({
          name,
          type,
          rarity,
          collection,
          rarityColor,
          compressedImage: null,
        }),
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
      console.error(
        "[card-image] animated render failed, falling back to static:",
        err
      );
      // fall through to the static path
    }
  }

  // ---- Static path (unchanged behaviour) ----
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
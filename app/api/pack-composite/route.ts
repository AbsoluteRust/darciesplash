import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { put } from '@vercel/blob';

export const runtime = 'nodejs';
export const maxDuration = 30;

const TARGET_WIDTH = 320;
const GAP = 24;
const BG = { r: 24, g: 24, b: 32, alpha: 1 };

export async function POST(req: NextRequest) {
  // Same Bearer token the bot uses for other calls
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.BOT_API_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { cards?: { name: string; imageUrl: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const cards = body.cards ?? [];
  if (cards.length === 0 || cards.length > 10) {
    return NextResponse.json({ error: 'cards must be 1-10 items' }, { status: 400 });
  }
  if (cards.some(c => !c.imageUrl)) {
    return NextResponse.json({ error: 'Every card needs an imageUrl' }, { status: 400 });
  }

  // Fetch all source images in parallel
  const buffers = await Promise.all(
    cards.map(async (c) => {
      const res = await fetch(c.imageUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Fetch failed for ${c.name}: ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    })
  );

  // Normalise to PNG and resize to a common width
  const normalised = await Promise.all(
    buffers.map((buf) =>
      // animated: false → first frame only (GIFs become static)
      sharp(buf, { animated: false })
        .resize(TARGET_WIDTH, null, { fit: 'inside', withoutEnlargement: false })
        .png()
        .toBuffer()
    )
  );

  const metas = await Promise.all(normalised.map((b) => sharp(b).metadata()));
  const maxHeight = Math.max(...metas.map((m) => m.height ?? 0));

  const totalWidth =
    TARGET_WIDTH * cards.length + GAP * (cards.length - 1);

  const layers = normalised.map((buf, i) => ({
    input: buf,
    left: i * (TARGET_WIDTH + GAP),
    // centre vertically if heights differ
    top: Math.floor((maxHeight - (metas[i].height ?? 0)) / 2),
  }));

  const composite = await sharp({
    create: {
      width: totalWidth,
      height: maxHeight,
      channels: 4,
      background: BG,
    },
  })
    .composite(layers)
    .png({ compressionLevel: 8 })
    .toBuffer();

  const blob = await put(
    `pack-composites/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`,
    composite,
    {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: 'image/png',
    }
  );

  return NextResponse.json({ url: blob.url });
}
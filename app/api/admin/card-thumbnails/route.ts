// app/api/admin/card-thumbnails/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { kv } from '@vercel/kv';
import { ADMIN_IDS } from '@/lib/admin';

export const dynamic = 'force-dynamic';

function botUrl() {
  return (process.env.PI_BOT_URL || '').replace(/\/$/, '');
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || !ADMIN_IDS.has(session.user.id)) return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [cardsRaw, overridesRaw] = await Promise.all([
    kv.get<any[]>('cards'),
    kv.hgetall('card_admin_overrides'),
  ]);

  const cards = cardsRaw || [];
  const overrides = overridesRaw || {};

  const merged = cards.map((c) => {
    const raw = overrides[c.name];
    let override: any = null;
    if (raw) {
      try { override = typeof raw === 'string' ? JSON.parse(raw) : raw; }
      catch { /* ignore malformed */ }
    }
    return {
      name: c.name,
      image: c.image,
      thumbUrl: override?.thumbUrl || c.thumbUrl,
      collection: c.collection,
      rarity: c.rarity,
      type: c.type,
      override: override
        ? {
            thumbUrl: override.thumbUrl,
            crop: override.crop,
            quality: override.quality,
            savedAt: override.savedAt,
          }
        : null,
    };
  });

  return NextResponse.json({ cards: merged });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const target = botUrl();
  if (!target) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  try {
    const res = await fetch(`${target}/api/admin/cards/thumb`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.PI_BOT_SECRET}`,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('[admin/card-thumbnails] proxy error:', err);
    return NextResponse.json({ error: 'Bot unreachable' }, { status: 502 });
  }
}
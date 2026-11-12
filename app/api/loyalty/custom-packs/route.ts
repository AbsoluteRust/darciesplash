// app/api/loyalty/custom-packs/route.ts
import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { auth } from '@/auth';
import { ADMIN_IDS } from '@/lib/admin';
import {
  CARD_COLLECTIONS,
  PACK_RARITIES,
  type CollectionFilter,
  type CustomPack,
  type PackRarity,
  type RarityFilter,
} from '@/lib/loyalty-milestones';

export const dynamic = 'force-dynamic';

const KEY = 'loyalty_custom_packs';

const PACK_RARITY_SET = new Set<string>(PACK_RARITIES);
const PACK_RARITY_ORDER = [...PACK_RARITIES];
const VALID_COLLECTIONS = new Set<string>(CARD_COLLECTIONS.map(c => c.id));

function sanitizeRarityFilter(raw: unknown): RarityFilter | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  switch (r.mode) {
    case 'all':
      return { mode: 'all' };
    case 'single': {
      const rar = typeof r.rarity === 'string' ? r.rarity : '';
      if (!PACK_RARITY_SET.has(rar)) return undefined;
      return { mode: 'single', rarity: rar as PackRarity };
    }
    case 'range': {
      const min = typeof r.min === 'string' ? r.min : '';
      const max = typeof r.max === 'string' ? r.max : '';
      if (!PACK_RARITY_SET.has(min) || !PACK_RARITY_SET.has(max)) return undefined;
      const minIdx = PACK_RARITY_ORDER.indexOf(min as PackRarity);
      const maxIdx = PACK_RARITY_ORDER.indexOf(max as PackRarity);
      if (minIdx < 0 || maxIdx < 0 || minIdx > maxIdx) return undefined;
      return { mode: 'range', min: min as PackRarity, max: max as PackRarity };
    }
    case 'list': {
      if (!Array.isArray(r.rarities)) return undefined;
      const seen = new Set<PackRarity>();
      const out: PackRarity[] = [];
      for (const v of r.rarities) {
        if (typeof v === 'string' && PACK_RARITY_SET.has(v) && !seen.has(v as PackRarity)) {
          seen.add(v as PackRarity);
          out.push(v as PackRarity);
        }
      }
      if (out.length === 0) return undefined;
      return { mode: 'list', rarities: out };
    }
    default:
      return undefined;
  }
}

function sanitizeCollectionFilter(raw: unknown): CollectionFilter | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  switch (r.mode) {
    case 'any':
      return { mode: 'any' };
    case 'specific':
    case 'distinct': {
      if (!Array.isArray(r.collections)) return undefined;
      const out: string[] = [];
      const seen = new Set<string>();
      for (const v of r.collections) {
        if (typeof v === 'string' && VALID_COLLECTIONS.has(v) && !seen.has(v)) {
          seen.add(v);
          out.push(v);
        }
      }
      if (out.length === 0) return undefined;
      return { mode: r.mode, collections: out };
    }
    default:
      return undefined;
  }
}

async function getPack(id: string): Promise<CustomPack | null> {
  const raw = await kv.hget(KEY, id).catch(() => null);
  if (!raw) return null;
  try { return typeof raw === 'string' ? JSON.parse(raw) : (raw as CustomPack); }
  catch { return null; }
}

async function listPacks(): Promise<CustomPack[]> {
  const raw = await kv.hgetall(KEY).catch(() => null);
  if (!raw) return [];
  const out: CustomPack[] = [];
  for (const v of Object.values(raw)) {
    try { out.push(typeof v === 'string' ? JSON.parse(v) : (v as CustomPack)); }
    catch { /* skip */ }
  }
  out.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  return out;
}

function makeId(): string {
  return `cp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !ADMIN_IDS.has(session.user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const packs = await listPacks();
  return NextResponse.json({ packs });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !ADMIN_IDS.has(session.user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const b = body as Record<string, unknown>;

  const name = typeof b.name === 'string' ? b.name.trim().slice(0, 100) : '';
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const cardCount = Math.floor(Number(b.cardCount));
  if (!Number.isInteger(cardCount) || cardCount < 1 || cardCount > 20) {
    return NextResponse.json({ error: 'cardCount must be 1–20' }, { status: 400 });
  }

  const rarityFilter = sanitizeRarityFilter(b.rarityFilter);
  if (!rarityFilter) {
    return NextResponse.json({ error: 'Invalid rarity filter' }, { status: 400 });
  }
  const collectionFilter = sanitizeCollectionFilter(b.collectionFilter);
  if (!collectionFilter) {
    return NextResponse.json({ error: 'Invalid collection filter' }, { status: 400 });
  }

  const existingId = typeof b.id === 'string' && b.id.trim() ? b.id.trim() : null;

  if (existingId) {
    const existing = await getPack(existingId);
    if (!existing) return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    const updated: CustomPack = {
      ...existing,
      name,
      cardCount,
      rarityFilter,
      collectionFilter,
      updatedAt: Date.now(),
    };
    await kv.hset(KEY, { [existingId]: JSON.stringify(updated) });
    return NextResponse.json({ ok: true, pack: updated });
  }

  const pack: CustomPack = {
    id: makeId(),
    name,
    cardCount,
    rarityFilter,
    collectionFilter,
    createdAt: Date.now(),
    createdBy: session.user.id,
  };
  await kv.hset(KEY, { [pack.id]: JSON.stringify(pack) });
  return NextResponse.json({ ok: true, pack });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !ADMIN_IDS.has(session.user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await kv.hdel(KEY, id);
  return NextResponse.json({ ok: true });
}
// app/api/loyalty/milestones/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kv } from "@vercel/kv";
import { ADMIN_IDS } from "@/lib/admin";
import {
  CARD_RARITIES,
  type CardRarity,
  type RewardKind,
  type TierOverride,
  type TierOverrides,
} from "@/lib/loyalty-milestones";

export const dynamic = 'force-dynamic';

const KEY = "loyalty_tiers";
const MAX_ICON_LENGTH = 80;
const RARITY_SET = new Set<string>(CARD_RARITIES);

function sanitizeRewardKind(raw: unknown): RewardKind | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  switch (r.kind) {
    case 'pack_points': {
      const n = Math.floor(Number(r.amount));
      if (!Number.isFinite(n) || n <= 0 || n > 1_000_000) return undefined;
      return { kind: 'pack_points', amount: n };
    }
    case 'card': {
      const cardName = typeof r.cardName === 'string' ? r.cardName.trim().slice(0, 120) : '';
      const rarity = typeof r.rarity === 'string' ? r.rarity.trim() : '';
      if (!cardName || !rarity || !RARITY_SET.has(rarity)) return undefined;
      return { kind: 'card', cardName, rarity: rarity as CardRarity };
    }
    case 'pack': {
      const packId = typeof r.packId === 'string' ? r.packId.trim().slice(0, 100) : '';
      if (!packId) return undefined;
      return { kind: 'pack', packId };
    }
    case 'minipack':
      return { kind: 'minipack' };
    case 'custom':
      return { kind: 'custom' };
    default:
      return undefined;
  }
}

export async function GET() {
  const stored = await kv.get(KEY);
  const overrides: TierOverrides =
    stored && typeof stored === "object" ? (stored as TierOverrides) : {};
  return NextResponse.json({ overrides });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !ADMIN_IDS.has(session.user.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const incoming = body?.overrides;
  if (!incoming || typeof incoming !== "object") {
    return NextResponse.json({ error: "Missing overrides object" }, { status: 400 });
  }

  // Pre-load existing pack IDs so a tier can only reference a real preset.
  const packRaw = await kv.hgetall('loyalty_custom_packs').catch(() => null);
  const existingPackIds = new Set<string>(
    packRaw ? Object.keys(packRaw) : []
  );

  const cleaned: TierOverrides = {};
  for (const [tierKey, val] of Object.entries(incoming)) {
    const tier = Number(tierKey);
    if (!Number.isInteger(tier) || tier < 1 || tier > 100) continue;
    if (!val || typeof val !== "object") continue;
    const t = val as TierOverride;
    const entry: TierOverride = {};

    if (typeof t.icon === "string" && t.icon.trim()) {
      entry.icon = t.icon.trim().slice(0, MAX_ICON_LENGTH);
    }
    if (typeof t.title === "string" && t.title.trim()) {
      entry.title = t.title.slice(0, 100);
    }
    if (typeof t.description === "string" && t.description.trim()) {
      entry.description = t.description.slice(0, 500);
    }
    if (typeof t.reward === "string" && t.reward.trim()) {
      entry.reward = t.reward.slice(0, 300);
    }
    const rewardKind = sanitizeRewardKind(t.rewardKind);
    if (rewardKind) {
      // Extra guard: `pack` rewards must reference an existing preset.
      if (rewardKind.kind === 'pack' && !existingPackIds.has(rewardKind.packId)) {
        // Drop the rewardKind, keep the display text. Admin will see
        // the pack choice isn't persisted next time they open the editor.
      } else {
        entry.rewardKind = rewardKind;
      }
    }

    if (Object.keys(entry).length > 0) cleaned[String(tier)] = entry;
  }

  if (Object.keys(cleaned).length === 0) {
    await kv.del(KEY);
  } else {
    await kv.set(KEY, cleaned);
  }

  return NextResponse.json({ ok: true, overrides: cleaned });
}
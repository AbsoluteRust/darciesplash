// app/api/loyalty/milestones/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kv } from "@vercel/kv";
import { ADMIN_IDS } from "@/lib/admin";
import type { TierOverride, TierOverrides } from "@/lib/loyalty-milestones";

export const dynamic = 'force-dynamic';

const KEY = "loyalty_tiers";

// Longest valid emote markup we accept:
//   <a:32CharEmoteName:1234567890123456789012345>  =  3 + 32 + 1 + 25 + 1 = 62 chars
// Round up for safety margin. Emoji are 1–4 chars typical, up to ~11 for ZWJ sequences.
const MAX_ICON_LENGTH = 80;

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

    if (Object.keys(entry).length > 0) cleaned[String(tier)] = entry;
  }

  if (Object.keys(cleaned).length === 0) {
    await kv.del(KEY);
  } else {
    await kv.set(KEY, cleaned);
  }

  return NextResponse.json({ ok: true, overrides: cleaned });
}
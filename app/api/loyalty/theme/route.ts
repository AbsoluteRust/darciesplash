// app/api/loyalty/theme/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kv } from "@vercel/kv";
import { ADMIN_IDS } from "@/lib/admin";
import { DEFAULT_THEME, type LoyaltyTheme } from "@/lib/loyalty-milestones";

export const dynamic = 'force-dynamic';

const KEY = "loyalty_theme";
const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export async function GET() {
  const stored = await kv.get(KEY);
  const theme: LoyaltyTheme = stored && typeof stored === "object"
    ? { ...DEFAULT_THEME, ...(stored as Partial<LoyaltyTheme>) }
    : DEFAULT_THEME;
  return NextResponse.json({ theme });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !ADMIN_IDS.has(session.user.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const incoming = body?.theme;
  if (!incoming || typeof incoming !== "object") {
    return NextResponse.json({ error: "Missing theme object" }, { status: 400 });
  }

  const cleaned: Partial<LoyaltyTheme> = {};
  for (const key of Object.keys(DEFAULT_THEME) as (keyof LoyaltyTheme)[]) {
    const val = (incoming as Record<string, unknown>)[key];
    if (typeof val === "string" && HEX_RE.test(val)) {
      cleaned[key] = val;
    }
  }

  if (Object.keys(cleaned).length === 0) {
    await kv.del(KEY);
  } else {
    await kv.set(KEY, cleaned);
  }

  return NextResponse.json({ ok: true, theme: { ...DEFAULT_THEME, ...cleaned } });
}
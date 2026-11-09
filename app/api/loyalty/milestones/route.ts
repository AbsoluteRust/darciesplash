// app/api/loyalty/milestones/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kv } from "@vercel/kv";
import { ADMIN_IDS } from "@/lib/admin";
import { DEFAULT_MILESTONES, type Milestone, type MilestoneType } from "@/lib/loyalty-milestones";

export const dynamic = 'force-dynamic';

const KEY = "loyalty_milestones";
const VALID_TYPES: MilestoneType[] = ["sub", "referral", "gift", "commissioner"];

export async function GET() {
  const stored = await kv.get(KEY);
  const milestones =
    Array.isArray(stored) && stored.length > 0 ? stored : DEFAULT_MILESTONES;
  return NextResponse.json({ milestones, isDefault: !stored });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !ADMIN_IDS.has(session.user.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const milestones = body?.milestones;
  if (!Array.isArray(milestones)) {
    return NextResponse.json({ error: "Missing milestones array" }, { status: 400 });
  }
  if (milestones.length > 60) {
    return NextResponse.json({ error: "Too many milestones (max 60)" }, { status: 400 });
  }

  const cleaned: Milestone[] = [];
  for (let i = 0; i < milestones.length; i++) {
    const m = milestones[i];
    if (!m || typeof m !== "object") {
      return NextResponse.json({ error: `Invalid milestone at index ${i}` }, { status: 400 });
    }
    const type = String(m.type || "");
    if (!VALID_TYPES.includes(type as MilestoneType)) {
      return NextResponse.json({ error: `Invalid type at index ${i}` }, { status: 400 });
    }
    const id = String(m.id || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);
    cleaned.push({
      id,
      type: type as MilestoneType,
      threshold: Math.max(1, Math.floor(Number(m.threshold) || 1)),
      icon: String(m.icon || "⭐").slice(0, 8),
      label: String(m.label || "").slice(0, 60),
      title: String(m.title || "").slice(0, 100),
      description: String(m.description || "").slice(0, 500),
      reward: String(m.reward || "").slice(0, 300),
    });
  }

  if (cleaned.length === 0) {
    await kv.del(KEY);
  } else {
    await kv.set(KEY, cleaned);
  }

  return NextResponse.json({ ok: true, milestones: cleaned });
}
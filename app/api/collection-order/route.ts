import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kv } from "@vercel/kv";
import { canEditCollectionOrder } from "@/lib/collection-owners";
import {
  normalizeLayout,
  validateLayout,
  DEFAULT_LAYOUT,
  type CollectionLayout,
} from "@/lib/collection-layout";

const KEY = (collection: string) => `collection_order:${collection}`;

// In-memory rate limit (2 seconds between saves)
const rateLimit = new Map<string, number>();
const RATE_LIMIT_MS = 2000;

const MAX_MANUAL_ORDER = 1000;
const MAX_SECTIONS = 50;
const MAX_CARDS_PER_SECTION = 1000;

function roleDefaults(roles: any) {
  return {
    commissioner: !!roles?.commissioner,
    darsubscribbler: !!roles?.darsubscribbler,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const collection = searchParams.get("collection");
  if (!collection) {
    return NextResponse.json({ error: "Missing collection" }, { status: 400 });
  }

  const raw = await kv.get(KEY(collection));
  const layout = raw ? normalizeLayout(raw) : DEFAULT_LAYOUT;

  const order =
    layout.mode === "auto" && layout.sortBy === "default"
      ? layout.manualOrder || []
      : [];

  return NextResponse.json({ ...layout, order });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // 1. Rate Limit
  const now = Date.now();
  const lastCall = rateLimit.get(session.user.id) || 0;
  if (now - lastCall < RATE_LIMIT_MS) {
    return NextResponse.json({ error: "Please wait a moment before saving again." }, { status: 429 });
  }
  rateLimit.set(session.user.id, now);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const collection = body?.collection;
  if (!collection || typeof collection !== "string") {
    return NextResponse.json({ error: "Missing collection" }, { status: 400 });
  }

  // 2. Length Caps (Prevent memory/CPU exhaustion)
  if (body.manualOrder) {
    if (!Array.isArray(body.manualOrder) || body.manualOrder.length > MAX_MANUAL_ORDER) {
      return NextResponse.json({ error: `manualOrder cannot exceed ${MAX_MANUAL_ORDER} cards` }, { status: 400 });
    }
  }
  if (body.sections) {
    if (!Array.isArray(body.sections) || body.sections.length > MAX_SECTIONS) {
      return NextResponse.json({ error: `Cannot have more than ${MAX_SECTIONS} sections` }, { status: 400 });
    }
    for (const s of body.sections) {
      if (!Array.isArray(s.cards) || s.cards.length > MAX_CARDS_PER_SECTION) {
        return NextResponse.json({ error: `A section cannot contain more than ${MAX_CARDS_PER_SECTION} cards` }, { status: 400 });
      }
    }
  }

  const roles = roleDefaults(
    (await kv.get(`account_roles:${session.user.id}`)) || {}
  );

  if (!canEditCollectionOrder(session.user.id, collection, roles)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const isLegacy = Array.isArray(body.order) && body.mode === undefined;
  const proposed: CollectionLayout = isLegacy
    ? {
        mode: "auto",
        sortBy: "default",
        manualOrder: body.order.filter((x: any) => typeof x === "string").slice(0, MAX_MANUAL_ORDER),
        randomised: false,
      }
    : normalizeLayout({
        mode: body.mode,
        sortBy: body.sortBy,
        manualOrder: body.manualOrder,
        sections: body.sections,
        randomised: body.randomised,
      });

  let allCardNames: string[] = [];
  try {
    const site =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_BASE_URL ||
      "http://localhost:3000";
    const r = await fetch(`${site}/api/cards/list`, { cache: "no-store" });
    if (r.ok) {
      const cards = await r.json();
      allCardNames = cards
        .filter((c: any) => c.collection === collection)
        .filter((c: any) => !c.contraband)
        .map((c: any) => c.name);
    }
  } catch {}

  const validation = validateLayout(proposed, allCardNames);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  proposed.updatedAt = Date.now();
  proposed.updatedBy = session.user.id;

  await kv.set(KEY(collection), proposed);

  const order =
    proposed.mode === "auto" && proposed.sortBy === "default"
      ? proposed.manualOrder || []
      : [];

  return NextResponse.json({ ok: true, layout: proposed, order });
}
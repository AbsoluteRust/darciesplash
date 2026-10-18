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
        manualOrder: body.order.filter((x: any) => typeof x === "string"),
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
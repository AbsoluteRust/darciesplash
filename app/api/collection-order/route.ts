import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kv } from "@vercel/kv";
import { canEditCollectionOrder } from "@/lib/collection-owners";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const collection = searchParams.get("collection");
  if (!collection) {
    return NextResponse.json({ error: "Missing collection" }, { status: 400 });
  }

  const order = (await kv.get(`collection_order:${collection}`)) || [];
  return NextResponse.json({ order });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { collection?: string; order?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { collection, order } = body;
  if (!collection || !Array.isArray(order) || !order.every(x => typeof x === "string")) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const roles = (await kv.get(`account_roles:${session.user.id}`)) || {
    commissioner: false,
    darsubscribbler: false,
  };

  if (!canEditCollectionOrder(session.user.id, collection, roles)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await kv.set(`collection_order:${collection}`, order);
  return NextResponse.json({ ok: true });
}
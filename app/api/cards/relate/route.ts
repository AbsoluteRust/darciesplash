import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

interface Card {
  name: string;
  related?: string[];
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth || auth !== `Bearer ${process.env.BOT_API_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, related } = await req.json();
  if (!title || !related) {
    return NextResponse.json({ error: "Missing title or related" }, { status: 400 });
  }

  if (title.toLowerCase() === String(related).toLowerCase()) {
    return NextResponse.json({ error: "Cannot relate a card to itself" }, { status: 400 });
  }

  const cards: Card[] = (await kv.get("cards")) || [];
  const lowerTitle = String(title).toLowerCase();
  const lowerRelated = String(related).toLowerCase();

  const a = cards.findIndex(c => c.name.toLowerCase() === lowerTitle);
  const b = cards.findIndex(c => c.name.toLowerCase() === lowerRelated);

  if (a === -1) return NextResponse.json({ error: `Card "${title}" not found` }, { status: 404 });
  if (b === -1) return NextResponse.json({ error: `Card "${related}" not found` }, { status: 404 });

  // Link both directions, deduped
  const aSet = new Set(cards[a].related || []);
  aSet.add(cards[b].name);
  cards[a].related = Array.from(aSet);

  const bSet = new Set(cards[b].related || []);
  bSet.add(cards[a].name);
  cards[b].related = Array.from(bSet);

  await kv.set("cards", cards);

  return NextResponse.json({ ok: true, a: cards[a].related, b: cards[b].related });
}
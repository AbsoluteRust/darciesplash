import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

interface Card {
  name: string;
  type: string;
  collection: string;
  image: string;
  description: string;
  details: string;
  link: string;
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth || auth !== `Bearer ${process.env.BOT_API_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, type, collection, about, imageUrl } = body;

  if (!title || !type || !collection || !about || !imageUrl) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const cards: Card[] = (await kv.get("cards")) || [];

  const newCard: Card = {
    name: title,
    type,
    collection,
    image: imageUrl,
    description: about,
    details: "",
    link: "",
  };

  cards.push(newCard);
  await kv.set("cards", cards);

  return NextResponse.json({ ok: true });
}
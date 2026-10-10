import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

interface Card {
  name: string;
  type: string;
  collection: string;
  image: string;
  thumbUrl?: string;
  description: string;
  details: string;
  link: string;
  commissioner?: string;
  contraband?: boolean;
  contrabandArtist?: string;
  rarity?: string;
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth || auth !== `Bearer ${process.env.BOT_API_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    title,
    type,
    collection,
    about,
    imageUrl,
    thumbUrl,
    commissioner,
    contraband,
    contrabandArtist,
    rarity,
  } = body;

  if (!title || !type || !collection || !imageUrl) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const cards: Card[] = (await kv.get("cards")) || [];

  const newCard: Card = {
    name: title,
    type,
    collection,
    image: imageUrl,
    ...(typeof thumbUrl === "string" && thumbUrl && { thumbUrl }),
    description: typeof about === "string" ? about : "",
    details: "",
    link: "",
    ...(commissioner && { commissioner }),
    ...(contraband && { contraband: true }),
    ...(contraband && contrabandArtist && { contrabandArtist }),
    ...(rarity && { rarity }),
  };

  cards.push(newCard);
  await kv.set("cards", cards);

  const deleted: string[] = (await kv.get("deleted")) || [];
  const filtered = deleted.filter(n => n.toLowerCase() !== title.toLowerCase());
  if (filtered.length !== deleted.length) {
    await kv.set("deleted", filtered);
  }

  return NextResponse.json({ ok: true });
}
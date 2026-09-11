import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { del } from "@vercel/blob";

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
  const { title, new_title, new_type, new_collection, new_about, new_image_url } = body;

  if (!title) {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }

  const lowerTitle = title.toLowerCase();
  const cards: Card[] = (await kv.get("cards")) || [];
  const index = cards.findIndex(c => c.name.toLowerCase() === lowerTitle);

  if (index === -1) {
    // Not in KV — likely a hardcoded card. Create a KV override entry with
    // only the fields the user changed. The site merges KV over hardcoded,
    // so any empty fields fall back to the hardcoded values.
    const override: Partial<Card> & { name: string } = {
      name: new_title || title,
    };
    if (new_type) override.type = new_type;
    if (new_collection) override.collection = new_collection;
    if (new_about) override.description = new_about;
    if (new_image_url) override.image = new_image_url;

    cards.push(override as Card);
    await kv.set("cards", cards);

    return NextResponse.json({ ok: true, card: override });
  }

  const oldImage = cards[index].image;

  cards[index] = {
    ...cards[index],
    ...(new_title && { name: new_title }),
    ...(new_type && { type: new_type }),
    ...(new_collection && { collection: new_collection }),
    ...(new_about && { description: new_about }),
    ...(new_image_url && { image: new_image_url }),
  };

  await kv.set("cards", cards);

  if (
    new_image_url &&
    oldImage &&
    oldImage !== new_image_url &&
    oldImage.includes("blob.vercel-storage.com")
  ) {
    try {
      await del(oldImage);
    } catch (err) {
      console.error("Failed to delete old blob:", err);
    }
  }

  return NextResponse.json({ ok: true, card: cards[index] });
}
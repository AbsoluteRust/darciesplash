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

  const cards: Card[] = (await kv.get("cards")) || [];
  const index = cards.findIndex(c => c.name.toLowerCase() === title.toLowerCase());

  if (index === -1) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
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

  // Best-effort: if the image was replaced, delete the old blob
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
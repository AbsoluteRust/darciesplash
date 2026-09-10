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

  const { title } = await req.json();
  if (!title) {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }

  const cards: Card[] = (await kv.get("cards")) || [];
  const index = cards.findIndex(c => c.name.toLowerCase() === title.toLowerCase());

  if (index === -1) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const [removed] = cards.splice(index, 1);
  await kv.set("cards", cards);

  // Best-effort: delete the image from Blob too
  if (removed.image && removed.image.includes("blob.vercel-storage.com")) {
    try {
      await del(removed.image);
    } catch (err) {
      console.error("Failed to delete blob:", err);
      // Don't fail the whole request if the image is already gone
    }
  }

  return NextResponse.json({ ok: true, removed });
}
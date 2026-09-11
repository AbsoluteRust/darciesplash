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

  const lowerTitle = title.toLowerCase();
  const cards: Card[] = (await kv.get("cards")) || [];
  const deleted: string[] = (await kv.get("deleted")) || [];

  let removed: Card | null = null;
  const index = cards.findIndex(c => c.name.toLowerCase() === lowerTitle);

  if (index !== -1) {
    [removed] = cards.splice(index, 1);
    await kv.set("cards", cards);

    // Best-effort: delete the image from Blob
    if (removed.image && removed.image.includes("blob.vercel-storage.com")) {
      try {
        await del(removed.image);
      } catch (err) {
        console.error("Failed to delete blob:", err);
      }
    }
  }

  // Record the name as deleted (hides hardcoded cards too)
  if (!deleted.some(n => n.toLowerCase() === lowerTitle)) {
    deleted.push(title);
    await kv.set("deleted", deleted);
  }

  return NextResponse.json({ ok: true, removed });
}
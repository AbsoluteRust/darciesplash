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
    // Not in KV — hardcoded override (legacy path, shouldn't happen after migration)
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
  const oldName = cards[index].name;
  const nameChanged = new_title && new_title.toLowerCase() !== lowerTitle;

  cards[index] = {
    ...cards[index],
    ...(new_title && { name: new_title }),
    ...(new_type && { type: new_type }),
    ...(new_collection && { collection: new_collection }),
    ...(new_about && { description: new_about }),
    ...(new_image_url && { image: new_image_url }),
  };

  await kv.set("cards", cards);

  // Delete old image from Blob if it was replaced
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

  // ⭐ If the card was renamed, update every user inventory that references the old name
  if (nameChanged) {
    try {
      const invKeys = await kv.keys("user_cards:*");
      let touchedUsers = 0;

      for (const invKey of invKeys) {
        const inv = (await kv.hgetall(invKey)) || {};
        const newInv: Record<string, number> = {};
        let changed = false;

        for (const [key, count] of Object.entries(inv)) {
          const [cardName, rarity] = key.split("|");
          if (cardName.toLowerCase() === lowerTitle) {
            const newKey = `${new_title}|${rarity}`;
            newInv[newKey] = (newInv[newKey] || 0) + Number(count);
            changed = true;
          } else {
            newInv[key] = Number(count);
          }
        }

        if (changed) {
          // Overwrite the whole hash — del + hset to avoid leaving stale fields
          await kv.del(invKey);
          await kv.hset(invKey, newInv);
          touchedUsers++;
        }
      }

      console.log(`[edit] renamed "${oldName}" → "${new_title}" in ${touchedUsers} inventories`);
    } catch (err) {
      console.error("[edit] failed to migrate inventories:", err);
      // Don't fail the whole request if inventory migration errors —
      // the card rename itself succeeded.
    }
  }

  return NextResponse.json({ ok: true, card: cards[index] });
}
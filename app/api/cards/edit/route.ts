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
    new_title,
    new_type,
    new_collection,
    new_about,
    new_details,
    new_link,
    new_image_url,
    new_rarity,
  } = body;

  if (!title) {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }

  const lowerTitle = title.toLowerCase();
  const cards: Card[] = (await kv.get("cards")) || [];
  const index = cards.findIndex(c => c.name.toLowerCase() === lowerTitle);

  // Build the merged field set, using !== undefined so empty strings clear values
  const updates: Partial<Card> = {};
  if (new_title !== undefined) updates.name = new_title;
  if (new_type !== undefined) updates.type = new_type;
  if (new_collection !== undefined) updates.collection = new_collection;
  if (new_about !== undefined) updates.description = new_about;
  if (new_details !== undefined) updates.details = new_details;
  if (new_link !== undefined) updates.link = new_link;
  if (new_image_url !== undefined) updates.image = new_image_url;
  if (new_rarity !== undefined) updates.rarity = new_rarity;

  // ---- Card not in KV: legacy override path ----
  if (index === -1) {
    const override: Partial<Card> & { name: string } = {
      name: new_title || title,
    };
    if (new_type !== undefined) override.type = new_type;
    if (new_collection !== undefined) override.collection = new_collection;
    if (new_about !== undefined) override.description = new_about;
    if (new_details !== undefined) override.details = new_details;
    if (new_link !== undefined) override.link = new_link;
    if (new_image_url !== undefined) override.image = new_image_url;
    if (new_rarity !== undefined) override.rarity = new_rarity;

    cards.push(override as Card);
    await kv.set("cards", cards);

    return NextResponse.json({ ok: true, card: override });
  }

  // ---- Existing card: merge updates ----
  const oldImage = cards[index].image;
  const oldName = cards[index].name;
  const nameChanged =
    new_title !== undefined &&
    new_title.toLowerCase() !== lowerTitle;

  cards[index] = {
    ...cards[index],
    ...updates,
  };

  await kv.set("cards", cards);

  // Delete old image from Blob if it was replaced
  if (
    new_image_url !== undefined &&
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

  // If the card was renamed, update every user inventory that references the old name
  if (nameChanged && new_title) {
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
          await kv.del(invKey);
          await kv.hset(invKey, newInv);
          touchedUsers++;
        }
      }

      console.log(`[edit] renamed "${oldName}" → "${new_title}" in ${touchedUsers} inventories`);
    } catch (err) {
      console.error("[edit] failed to migrate inventories:", err);
    }
  }

  return NextResponse.json({ ok: true, card: cards[index] });
}
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const RARITY_ORDER = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"];

function rank(name: string | undefined): number {
  if (!name) return -1;
  const i = RARITY_ORDER.indexOf(name);
  return i === -1 ? 0 : i;
}

export async function GET() {
  const [cardsRaw, highestPullRaw] = await Promise.all([
    kv.get<any[]>("cards"),
    kv.hgetall("card_highest_pull"),
  ]);

  const cards = cardsRaw || [];
  const highest = highestPullRaw || {};

  const resolved = cards.map((c) => {
    const manual = c.rarity;
    let display: string;

    if (manual && manual !== "default") {
      display = manual;
    } else {
      display = highest[c.name] || "Common";
    }

    return { ...c, rarity: display };
  });

  return NextResponse.json(resolved);
}
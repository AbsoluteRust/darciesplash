// app/api/cards/list/route.ts
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const RARITY_ORDER = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"];

function rank(name: string | undefined): number {
  if (!name) return -1;
  const i = RARITY_ORDER.indexOf(name);
  return i === -1 ? 0 : i;
}

export async function GET() {
  const [cardsRaw, highestPullRaw, overridesRaw] = await Promise.all([
    kv.get<any[]>("cards"),
    kv.hgetall("card_highest_pull"),
    kv.hgetall("card_admin_overrides"),
  ]);

  const cards = cardsRaw || [];
  const highest = highestPullRaw || {};
  const overrides = overridesRaw || {};

  const resolved = cards.map((c) => {
    const manual = c.rarity;
    let display: string;

    if (manual && manual !== "default") {
      display = manual;
    } else {
      display = highest[c.name] || "Common";
    }

    // Merge admin overrides (currently just thumbUrl; name and other
    // fields will join this block when the rename feature ships).
    let withOverrides = c;
    const rawOverride = overrides[c.name];
    if (rawOverride) {
      try {
        const o = typeof rawOverride === "string" ? JSON.parse(rawOverride) : rawOverride;
        if (o?.thumbUrl) {
          withOverrides = { ...c, thumbUrl: o.thumbUrl };
        }
      } catch {
        // malformed override — ignore and use defaults
      }
    }

    return { ...withOverrides, rarity: display };
  });

  return NextResponse.json(resolved);
}
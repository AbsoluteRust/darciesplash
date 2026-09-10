import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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

  // Path to cards.json
  const cardsFile = path.join(process.cwd(), "data", "cards.json");

  // Read existing cards
  const raw = fs.readFileSync(cardsFile, "utf8");
  const cards = JSON.parse(raw);

  // Create new card
  const newCard = {
  name: title,
  type,
  collection,   // ⭐ ADD THIS
  image: imageUrl,
  description: about,
  details: "",
  link: ""
};


  // Add card
  cards.push(newCard);

  // Save file
  fs.writeFileSync(cardsFile, JSON.stringify(cards, null, 2), "utf8");

  return NextResponse.json({ ok: true });
}

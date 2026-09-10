import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function GET() {
  const cards = (await kv.get("cards")) || [];
  return NextResponse.json(cards);
}
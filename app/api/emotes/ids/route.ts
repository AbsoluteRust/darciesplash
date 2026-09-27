import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function GET() {
  const map = (await kv.get("guild_emotes")) || {};
  return NextResponse.json(map);
}
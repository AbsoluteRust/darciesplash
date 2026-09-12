import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function GET() {
  const totals = (await kv.hgetall("emote_totals")) || {};
  return NextResponse.json(totals);
}
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kv } from "@vercel/kv";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const inv = (await kv.hgetall(`user_cards:${session.user.id}`)) || {};
  // inv looks like { "LilyDoll|Rare": 3, "MagiSip|Common": 1, ... }
  return NextResponse.json(inv);
}
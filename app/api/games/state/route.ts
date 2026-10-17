import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(`${process.env.BOT_HTTP_URL}/api/games/state`, {
      headers: { Authorization: `Bearer ${process.env.BOT_HTTP_SECRET}` },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ puzzle: null, drop: null });
    return NextResponse.json(await res.json());
  } catch (err) {
    return NextResponse.json({ puzzle: null, drop: null });
  }
}
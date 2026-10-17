import { NextResponse } from "next/server";

export async function GET() {
  const res = await fetch(`${process.env.PI_BOT_URL}/api/games/state`, {
    headers: { Authorization: `Bearer ${process.env.PI_BOT_SECRET}` },
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json({ error: "Failed to fetch state" }, { status: 500 });
  return NextResponse.json(await res.json());
}
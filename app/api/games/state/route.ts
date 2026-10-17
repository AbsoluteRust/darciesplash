import { NextResponse } from "next/server";

export async function GET() {
  try {
    const botUrl = (process.env.PI_BOT_URL || "").replace(/\/$/, "");
    
    if (!botUrl) return NextResponse.json({ puzzle: null, drop: null });

    const res = await fetch(`${botUrl}/api/games/state`, {
      headers: { Authorization: `Bearer ${process.env.PI_BOT_SECRET}` },
      cache: "no-store",
    });
    
    if (!res.ok) return NextResponse.json({ puzzle: null, drop: null });
    return NextResponse.json(await res.json());
  } catch (err) {
    return NextResponse.json({ puzzle: null, drop: null });
  }
}
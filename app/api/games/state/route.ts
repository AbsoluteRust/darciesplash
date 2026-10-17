import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "";
    
    const botUrl = (process.env.PI_BOT_URL || "").replace(/\/$/, "");
    if (!botUrl) return NextResponse.json({ puzzle: null, drop: null });

    const res = await fetch(`${botUrl}/api/games/state?userId=${userId}`, {
      headers: { Authorization: `Bearer ${process.env.PI_BOT_SECRET}` },
      cache: "no-store",
    });
    
    if (!res.ok) return NextResponse.json({ puzzle: null, drop: null });
    return NextResponse.json(await res.json());
  } catch (err) {
    return NextResponse.json({ puzzle: null, drop: null });
  }
}
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "";
    
    const botUrl = (process.env.PI_BOT_URL || "").replace(/\/$/, "");
    if (!botUrl) {
      return NextResponse.json({ error: "Missing PI_BOT_URL in Vercel" }, { status: 500 });
    }

    const res = await fetch(`${botUrl}/api/games/state?userId=${userId}`, {
      headers: { Authorization: `Bearer ${process.env.PI_BOT_SECRET}` },
      cache: "no-store",
    });
    
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Bot returned ${res.status}: ${text.slice(0, 100)}` }, { status: res.status });
    }

    return NextResponse.json(await res.json());
  } catch (err: any) {
    return NextResponse.json({ error: `Fetch failed: ${err.message}` }, { status: 500 });
  }
}
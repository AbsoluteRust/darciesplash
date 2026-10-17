import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { shortId } = await req.json();
    const botUrl = (process.env.BOT_HTTP_URL || "").replace(/\/$/, "");

    if (!botUrl) return NextResponse.json({ error: "Server config error: missing BOT_HTTP_URL" }, { status: 500 });

    const res = await fetch(`${botUrl}/api/games/reroll`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.BOT_HTTP_SECRET}`,
      },
      body: JSON.stringify({ userId: session.user.id, shortId }),
    });

    // Catch HTML errors (like Cloudflare 502/504 pages)
    const text = await res.text();
    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      console.error("[Vercel] Bot returned non-JSON:", text.slice(0, 100));
      return NextResponse.json({ error: "Bot returned invalid response" }, { status: 500 });
    }
  } catch (err) {
    console.error("[Vercel] Reroll API error:", err);
    return NextResponse.json({ error: "Failed to communicate with bot" }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { shortId } = await req.json();

    const res = await fetch(`${process.env.BOT_HTTP_URL}/api/games/reroll`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.BOT_HTTP_SECRET}`,
      },
      body: JSON.stringify({ userId: session.user.id, shortId }),
    });
    
    return NextResponse.json(await res.json());
  } catch (err) {
    return NextResponse.json({ error: "Failed to communicate with bot" }, { status: 500 });
  }
}
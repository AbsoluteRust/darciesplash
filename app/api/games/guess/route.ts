import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const botUrl = (process.env.PI_BOT_URL || "").replace(/\/$/, "");

    if (!botUrl) return NextResponse.json({ error: "Missing PI_BOT_URL" }, { status: 500 });

    const res = await fetch(`${botUrl}/api/games/guess`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PI_BOT_SECRET}`,
      },
      body: JSON.stringify({ 
        ...body, 
        userId: session.user.id, 
        username: session.user.name || "WebUser" 
      }),
    });
    
    return NextResponse.json(await res.json());
  } catch (err) {
    return NextResponse.json({ error: "Failed to communicate with bot" }, { status: 500 });
  }
}
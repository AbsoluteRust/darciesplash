import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { emoteId, game } = await req.json();

  const res = await fetch(`${process.env.PI_BOT_URL}/api/games/guess`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PI_BOT_SECRET}`,
    },
    body: JSON.stringify({ userId: session.user.id, emoteId, game }),
  });
  
  return NextResponse.json(await res.json());
}
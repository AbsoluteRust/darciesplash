import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { packId } = await req.json();
  if (!packId) return NextResponse.json({ error: "Missing packId" }, { status: 400 });

  try {
    const botUrl = (process.env.PI_BOT_URL || "").replace(/\/$/, "");
    const res = await fetch(`${botUrl}/api/open-minipack`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PI_BOT_SECRET}`,
      },
      body: JSON.stringify({ userId: session.user.id, packId }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: "Failed to open minipack" }, { status: 500 });
  }
}
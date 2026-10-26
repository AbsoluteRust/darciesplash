import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const botUrl = (process.env.PI_BOT_URL || "").replace(/\/$/, "");
    const res = await fetch(`${botUrl}/api/minipacks?userId=${session.user.id}`, {
      headers: { Authorization: `Bearer ${process.env.PI_BOT_SECRET}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(await res.text());
    return NextResponse.json(await res.json());
  } catch (err) {
    console.error("Failed to fetch minipacks:", err);
    return NextResponse.json({ error: "Failed to fetch minipacks" }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { auth } from "@/auth";

// 1. Force Node.js runtime
export const runtime = 'nodejs';
// 2. Allow Vercel to wait up to 60 seconds for the Pi to resolve the group lobby
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const botUrl = (process.env.PI_BOT_URL || "").replace(/\/$/, "");
    if (!botUrl) throw new Error("PI_BOT_URL is missing");

    const res = await fetch(`${botUrl}/api/games/group/status`, {
      headers: { Authorization: `Bearer ${process.env.PI_BOT_SECRET}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Bot returned ${res.status}: ${errorText}`);
    }

    return NextResponse.json(await res.json());
  } catch (err: any) {
    console.error("Failed to fetch group status:", err);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}
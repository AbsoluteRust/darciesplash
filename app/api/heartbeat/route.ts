import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kv } from "@vercel/kv";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false });

  // Store the timestamp in a hash so we can quickly scan all online users
  await kv.hset("user_heartbeats", { [session.user.id]: Date.now() });
  
  return NextResponse.json({ ok: true });
}
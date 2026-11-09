// app/api/me/roles/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kv } from "@vercel/kv";

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({
      userId: null,
      darsubscribbler: false,
      commissioner: false,
    });
  }

  const raw = (await kv.get(`account_roles:${session.user.id}`)) || {};

  return NextResponse.json({
    userId: session.user.id,
    darsubscribbler: !!raw.darsubscribbler,
    commissioner: !!raw.commissioner,
  });
}
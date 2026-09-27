import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kv } from "@vercel/kv";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ signedIn: false });
  }

  const [roles, profile] = await Promise.all([
    kv.get(`account_roles:${session.user.id}`).catch(() => null),
    kv.get(`user_profiles:${session.user.id}`).catch(() => null),
  ]);

  return NextResponse.json({
    signedIn: true,
    user: {
      id: session.user.id,
      name: session.user.name,
      image: session.user.image,
    },
    roles: roles || { commissioner: false, darsubscribbler: false },
    profile: profile || null,
  });
}
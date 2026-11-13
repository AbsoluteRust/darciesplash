// app/api/me/preview/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { kv } from '@vercel/kv';
import { ADMIN_IDS } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({
      signedIn: false,
      isRealAdmin: false,
      isRealDarsubscriber: false,
    });
  }

  const userId = session.user.id;
  const isRealAdmin = ADMIN_IDS.has(userId);

  const roles = await kv.get(`account_roles:${userId}`).catch(() => null);
  const isRealDarsubscriber = !!(roles as any)?.darsubscribbler;

  return NextResponse.json({
    signedIn: true,
    isRealAdmin,
    isRealDarsubscriber,
  });
}
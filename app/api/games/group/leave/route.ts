// app/api/games/group/leave/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function POST(_req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const botUrl = (process.env.PI_BOT_URL || '').replace(/\/$/, '');
  if (!botUrl) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

  const res = await fetch(`${botUrl}/api/games/group/leave`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.PI_BOT_SECRET}`,
    },
    body: JSON.stringify({ userId: session.user.id }),
    cache: 'no-store',
  });
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}
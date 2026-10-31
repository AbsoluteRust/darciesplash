import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// 1. Force Node.js runtime (Edge has a hard 30s limit, Node.js allows longer)
export const runtime = 'nodejs';
// 2. Tell Vercel to allow up to 60 seconds for this route to finish
export const maxDuration = 60;

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const botUrl = process.env.PI_BOT_URL;
  const secret = process.env.PI_BOT_SECRET;

  if (!botUrl || !secret) {
    return NextResponse.json({ error: 'Bot not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(`${botUrl.replace(/\/$/, '')}/api/open-pack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ userId }),
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('[open-pack] bot unreachable:', err);
    return NextResponse.json({ error: 'Bot unreachable' }, { status: 502 });
  }
}
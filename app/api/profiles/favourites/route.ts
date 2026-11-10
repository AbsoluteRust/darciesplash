// app/api/profiles/favorites/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { kv } from '@vercel/kv';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { cardNames } = await req.json();
  
  if (!Array.isArray(cardNames)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  if (cardNames.length > 8) {
    return NextResponse.json({ error: 'You can only showcase up to 8 cards' }, { status: 400 });
  }

  try {
    await kv.set(`user_favorites:${session.user.id}`, JSON.stringify(cardNames));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to save favorites:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
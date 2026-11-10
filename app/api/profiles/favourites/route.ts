// app/api/profiles/favorites/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { kv } from '@vercel/kv';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized: No active session found' }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { cardNames } = body;
    
    if (!Array.isArray(cardNames)) {
      return NextResponse.json({ error: 'cardNames must be an array' }, { status: 400 });
    }
    
    if (cardNames.length > 8) {
      return NextResponse.json({ error: 'You can only showcase up to 8 cards' }, { status: 400 });
    }

    await kv.set(`user_favorites:${session.user.id}`, JSON.stringify(cardNames));
    
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[favorites API] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
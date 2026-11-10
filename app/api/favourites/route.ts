// app/api/favorites/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { kv } from '@vercel/kv';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { cardNames } = body;
    
    if (!Array.isArray(cardNames)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    if (cardNames.length > 8) {
      return NextResponse.json({ error: 'Max 8 cards allowed' }, { status: 400 });
    }

    // Store the array directly — @vercel/kv handles serialization
    await kv.set(`user_favorites:${session.user.id}`, cardNames);
    
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[favorites API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
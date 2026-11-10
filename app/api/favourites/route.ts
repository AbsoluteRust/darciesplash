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

    // Force both to string to ensure the key is identical to the GET route
    const userId = String(session.user.id);
    const key = `user_favorites:${userId}`;
    const payload = JSON.stringify(cardNames);
    
    // Write to database
    await kv.set(key, payload);
    
    // Verify what we just wrote
    const verify = await kv.get(key);
    console.log(`[favorites API] SAVED to ${key}:`, payload);
    console.log(`[favorites API] VERIFIED:`, verify);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[favorites API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
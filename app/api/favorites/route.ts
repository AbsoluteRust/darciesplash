// app/api/favorites/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { kv } from '@vercel/kv';

async function isDarsubscriber(userId: string): Promise<boolean> {
  const roles = await kv.get(`account_roles:${userId}`).catch(() => null);
  return !!(roles as any)?.darsubscribbler;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized: You must be logged in to save.' }, { status: 401 });
    }

    const userId = String(session.user.id);

    // Editable showcase is a Darsubscriber-only feature.
    if (!(await isDarsubscriber(userId))) {
      return NextResponse.json(
        { error: 'Darsubscriber feature — subscribe on Ko-fi to edit your showcase.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { cardNames } = body;

    if (!Array.isArray(cardNames)) {
      return NextResponse.json({ error: 'Invalid payload format' }, { status: 400 });
    }

    if (cardNames.length > 8) {
      return NextResponse.json({ error: 'You can only showcase up to 8 cards' }, { status: 400 });
    }

    const key = `user_favorites:${userId}`;
    const payload = JSON.stringify(cardNames);

    await kv.set(key, payload);

    return NextResponse.json({ ok: true, saved: cardNames });
  } catch (err: any) {
    console.error('[favorites API] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
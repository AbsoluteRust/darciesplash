import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { kv } from '@vercel/kv';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify they are a darsubscribbler
  const roles = (await kv.get(`account_roles:${session.user.id}`)) || {};
  if (!roles.darsubscribbler) {
    return NextResponse.json({ error: 'Must be a darsubscribbler' }, { status: 403 });
  }

  const { colorHex } = await req.json();
  if (!/^#[0-9A-F]{6}$/i.test(colorHex)) {
    return NextResponse.json({ error: 'Invalid color format' }, { status: 400 });
  }

  try {
    const botUrl = (process.env.PI_BOT_URL || '').replace(/\/$/, '');
    const res = await fetch(`${botUrl}/api/user/color`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.PI_BOT_SECRET}`,
      },
      body: JSON.stringify({ userId: session.user.id, colorHex }),
    });

    if (!res.ok) throw new Error(await res.text());
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to update color role:', err);
    return NextResponse.json({ error: 'Bot failed to update role' }, { status: 500 });
  }
}
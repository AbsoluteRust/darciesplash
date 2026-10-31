import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// 1. Force Node.js runtime so Vercel doesn't kill the 30s connection
export const runtime = 'nodejs';
// 2. Allow up to 60 seconds for the Pi to generate and upload images
export const maxDuration = 60;

export async function POST() {
  const session = await auth();
  
  // Trim any accidental spaces
  const userId = session?.user?.id?.trim();

  if (!userId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  // 3. Strict validation: Ensure it's a real Discord ID (17-20 digits)
  // This catches stale cookies or bad DM logins before they hit the bot.
  if (!/^\d{17,20}$/.test(userId)) {
    return NextResponse.json(
      { error: 'Your session is outdated or invalid. Please log out and log back in.' }, 
      { status: 400 }
    );
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
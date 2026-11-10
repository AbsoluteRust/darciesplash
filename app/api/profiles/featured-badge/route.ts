// app/api/profiles/featured-badge/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { kv } from '@vercel/kv';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { badgeId } = await req.json();
  
  if (badgeId === null) {
    await kv.del(`user_featured_badge:${session.user.id}`);
    return NextResponse.json({ ok: true });
  }

  if (typeof badgeId !== 'string') {
    return NextResponse.json({ error: 'Invalid badge ID' }, { status: 400 });
  }

  await kv.set(`user_featured_badge:${session.user.id}`, badgeId);
  return NextResponse.json({ ok: true });
}
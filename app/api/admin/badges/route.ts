// app/api/admin/badges/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { kv } from '@vercel/kv';
import { ADMIN_IDS } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const overrides = (await kv.get('custom_badges')) || {};
  return NextResponse.json({ overrides });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !ADMIN_IDS.has(session.user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { overrides } = await req.json();
  if (!overrides || typeof overrides !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  await kv.set('custom_badges', overrides);
  return NextResponse.json({ ok: true, overrides });
}
// app/api/admin/emotes/route.ts
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const botUrl = (process.env.PI_BOT_URL || '').replace(/\/$/, '');
  if (!botUrl) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

  const res = await fetch(`${botUrl}/api/admin/emotes/manifest`, {
    headers: { Authorization: `Bearer ${process.env.PI_BOT_SECRET}` },
    cache: 'no-store',
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
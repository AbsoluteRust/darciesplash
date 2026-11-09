// app/api/admin/emotes/bulk-assign/route.ts
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const botUrl = (process.env.PI_BOT_URL || '').replace(/\/$/, '');
  if (!botUrl) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

  const body = await req.json();
  const res = await fetch(`${botUrl}/api/admin/emotes/bulk-assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.PI_BOT_SECRET}`,
    },
    body: JSON.stringify({ ...body, adminId: session.user.id }),
    cache: 'no-store',
  });
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}
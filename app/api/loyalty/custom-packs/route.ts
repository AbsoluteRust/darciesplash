// app/api/loyalty/custom-packs/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ADMIN_IDS } from '@/lib/admin';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || !ADMIN_IDS.has(session.user.id)) return null;
  return session;
}

function botUrlBase() {
  return (process.env.PI_BOT_URL || '').replace(/\/$/, '');
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const botUrl = botUrlBase();
  if (!botUrl) return NextResponse.json({ error: 'Bot not configured' }, { status: 500 });

  const res = await fetch(`${botUrl}/api/loyalty/custom-packs`, {
    headers: { Authorization: `Bearer ${process.env.PI_BOT_SECRET}` },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const botUrl = botUrlBase();
  if (!botUrl) return NextResponse.json({ error: 'Bot not configured' }, { status: 500 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const res = await fetch(`${botUrl}/api/loyalty/custom-packs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.PI_BOT_SECRET}`,
    },
    body: JSON.stringify({ ...(body as Record<string, unknown>), createdBy: session.user.id }),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const botUrl = botUrlBase();
  if (!botUrl) return NextResponse.json({ error: 'Bot not configured' }, { status: 500 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const res = await fetch(`${botUrl}/api/loyalty/custom-packs?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${process.env.PI_BOT_SECRET}` },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
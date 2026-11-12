// app/api/loyalty/open-pack/route.ts
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id?.trim();
  if (!userId) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }
  if (!/^\d{17,20}$/.test(userId)) {
    return Response.json({ error: 'Invalid session' }, { status: 400 });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const pendingId = typeof body?.pendingId === 'string' ? body.pendingId.trim() : '';
  if (!pendingId) {
    return Response.json({ error: 'Missing pendingId' }, { status: 400 });
  }

  const botUrl = (process.env.PI_BOT_URL || '').replace(/\/$/, '');
  if (!botUrl) {
    return Response.json({ error: 'Bot not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(`${botUrl}/api/loyalty/open-pack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.PI_BOT_SECRET}`,
      },
      body: JSON.stringify({ userId, pendingId }),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error('[loyalty/open-pack] bot unreachable:', err);
    return Response.json({ error: 'Bot unreachable' }, { status: 502 });
  }
}
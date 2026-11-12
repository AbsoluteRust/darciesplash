// app/api/loyalty/pending-packs/route.ts
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id?.trim();
  if (!userId || !/^\d{17,20}$/.test(userId)) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  const botUrl = (process.env.PI_BOT_URL || '').replace(/\/$/, '');
  if (!botUrl) return Response.json({ error: 'Bot not configured' }, { status: 500 });

  try {
    const res = await fetch(`${botUrl}/api/loyalty/pending-packs?userId=${userId}`, {
      headers: { Authorization: `Bearer ${process.env.PI_BOT_SECRET}` },
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error('[loyalty/pending-packs] bot unreachable:', err);
    return Response.json({ packs: [] }, { status: 200 });
  }
}
// app/api/loyalty/claim/route.ts
import { auth } from '@/auth';
import { kv } from '@vercel/kv';
import {
  buildAllTiers,
  tierForStardust,
  type TierOverrides,
} from '@/lib/loyalty-milestones';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id?.trim();
  if (!userId) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }
  if (!/^\d{17,20}$/.test(userId)) {
    return Response.json(
      { error: 'Your session is outdated or invalid. Please sign out and back in.' },
      { status: 400 }
    );
  }

  let body: any;
  try { body = await req.json(); }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const tierNum = Number(body?.tier);
  if (!Number.isInteger(tierNum) || tierNum < 1) {
    return Response.json({ error: 'Invalid tier' }, { status: 400 });
  }

  const [overridesRaw, stardustRaw] = await Promise.all([
    kv.get('loyalty_tiers').catch(() => null),
    kv.hget('user_stardust', userId).catch(() => null),
  ]);

  const overrides: TierOverrides =
    overridesRaw && typeof overridesRaw === 'object'
      ? (overridesRaw as TierOverrides)
      : {};

  // Single source of truth — lib/stardust.js writes to this hash on the bot.
  const stardust = Number(stardustRaw) || 0;
  const unlockedTier = tierForStardust(stardust);
  if (tierNum > unlockedTier) {
    return Response.json(
      { error: 'Tier not unlocked yet', currentTier: unlockedTier },
      { status: 403 }
    );
  }

  const tiers = buildAllTiers(overrides);
  const target = tiers.find(t => t.tier === tierNum);
  if (!target) {
    return Response.json({ error: 'Unknown tier' }, { status: 400 });
  }
  if (!target.rewardKind) {
    return Response.json(
      { error: 'This tier has no auto-grantable reward configured' },
      { status: 400 }
    );
  }

  const botUrl = (process.env.PI_BOT_URL || '').replace(/\/$/, '');
  if (!botUrl) {
    return Response.json({ error: 'Bot not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(`${botUrl}/api/loyalty/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.PI_BOT_SECRET}`,
      },
      body: JSON.stringify({
        discordId: userId,
        tier: tierNum,
        tierTitle: target.title,
        rewardKind: target.rewardKind,
      }),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error('[loyalty/claim] bot unreachable:', err);
    return Response.json({ error: 'Bot unreachable' }, { status: 502 });
  }
}
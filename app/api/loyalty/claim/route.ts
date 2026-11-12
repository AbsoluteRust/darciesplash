// app/api/loyalty/claim/route.ts
import { auth } from '@/auth';
import { kv } from '@vercel/kv';
import {
  buildAllTiers,
  tierForStardust,
  MAJOR_ACTION_VALUE,
  type TierOverrides,
} from '@/lib/loyalty-milestones';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const tierNum = Number(body?.tier);
  if (!Number.isInteger(tierNum) || tierNum < 1) {
    return Response.json({ error: 'Invalid tier' }, { status: 400 });
  }

  const [overridesRaw, badgesRaw, rolesRaw] = await Promise.all([
    kv.get('loyalty_tiers').catch(() => null),
    kv.hgetall(`user_badges:${userId}`).catch(() => null),
    kv.get(`account_roles:${userId}`).catch(() => null),
  ]);

  const overrides: TierOverrides =
    overridesRaw && typeof overridesRaw === 'object'
      ? (overridesRaw as TierOverrides)
      : {};
  const b = badgesRaw || {};
  const r = rolesRaw || {};

  const stardust =
    Number(b.sub_months || 0) * MAJOR_ACTION_VALUE +
    Number(b.referrals || 0) * MAJOR_ACTION_VALUE +
    Number(b.gifts || 0) * MAJOR_ACTION_VALUE +
    (r.commissioner ? MAJOR_ACTION_VALUE : 0);

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
    return Response.json({ error: 'Server config error' }, { status: 500 });
  }

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
  });

  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
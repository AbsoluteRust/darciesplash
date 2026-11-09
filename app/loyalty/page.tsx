// app/loyalty/page.tsx
import { auth } from '@/auth';
import { kv } from '@vercel/kv';
import { ADMIN_IDS } from '@/lib/admin';
import {
  buildAllTiers,
  isTrackActive,
  tierForStardust,
  type TierOverrides,
} from '@/lib/loyalty-milestones';
import LoyaltyClient from './LoyaltyClient';
import './page.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Loyalty Journey",
  description: "Your path through the stars of Folly of Flora.",
};

export default async function LoyaltyPage() {
  const session = await auth();
  const userId = session?.user?.id || null;
  const isAdmin = !!userId && ADMIN_IDS.has(userId);

  const storedOverrides = await kv.get('loyalty_tiers').catch(() => null);
  const overrides: TierOverrides =
    storedOverrides && typeof storedOverrides === 'object'
      ? (storedOverrides as TierOverrides)
      : {};
  const tiers = buildAllTiers(overrides);

  const trackActive = isTrackActive();

  let profile: {
    subMonths: number;
    referrals: number;
    gifts: number;
    isCommissioner: boolean;
  } | null = null;

  if (userId) {
    const botUrl = (process.env.PI_BOT_URL || '').replace(/\/$/, '');
    const [rawBadges, roles, kofiData] = await Promise.all([
      kv.hgetall(`user_badges:${userId}`).catch(() => null),
      kv.get(`account_roles:${userId}`).catch(() => null),
      botUrl
        ? fetch(`${botUrl}/api/kofi/subscription?discordId=${userId}`, {
            headers: { Authorization: `Bearer ${process.env.PI_BOT_SECRET}` },
            cache: 'no-store',
          })
            .then(r => (r.ok ? r.json() : { months: 0 }))
            .catch(() => ({ months: 0 }))
        : Promise.resolve({ months: 0 }),
    ]);
    const b = rawBadges || {};
    const r = roles || {};
    profile = {
      subMonths: Math.max(Number(b.sub_months || 0), Number(kofiData?.months || 0)),
      referrals: Number(b.referrals || 0),
      gifts: Number(b.gifts || 0),
      isCommissioner: !!r.commissioner,
    };
  }

  // Major-action stardust. Weekly bonus stardust is not yet tracked per-user;
  // when it is (post-2027), add it to `currentStardust` here.
  let currentStardust = 0;
  if (trackActive && profile) {
    currentStardust = profile.subMonths * 6800
      + profile.referrals * 6800
      + profile.gifts * 6800
      + (profile.isCommissioner ? 6800 : 0);
  }
  const currentTier = tierForStardust(currentStardust);

  return (
    <div className="loyalty-page">
      <div className="loyalty-header">
        <h1 className="loyalty-title">Your Loyalty Journey</h1>
        <p className="loyalty-subtitle">
          Drag through the stars. Every tier is a step along the path — click any star to inspect its reward.
        </p>
      </div>
      <LoyaltyClient
        signedIn={!!userId}
        isAdmin={isAdmin}
        trackActive={trackActive}
        currentStardust={currentStardust}
        currentTier={currentTier}
        initialOverrides={overrides}
        initialTiers={tiers}
      />
    </div>
  );
}
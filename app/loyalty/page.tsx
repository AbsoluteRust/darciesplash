// app/loyalty/page.tsx
import { auth } from '@/auth';
import { kv } from '@vercel/kv';
import { ADMIN_IDS } from '@/lib/admin';
import {
  buildAllTiers,
  isTrackActive,
  tierForStardust,
  DEFAULT_THEME,
  MAJOR_ACTION_VALUE,
  type LoyaltyTheme,
  type TierOverrides,
  type LoyaltyClaims,
  type LoyaltyClaim,
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

  const [storedOverrides, storedTheme, storedClaims] = await Promise.all([
    kv.get('loyalty_tiers').catch(() => null),
    kv.get('loyalty_theme').catch(() => null),
    userId
      ? kv.hgetall(`loyalty_claims:${userId}`).catch(() => null)
      : Promise.resolve(null),
  ]);

  const overrides: TierOverrides =
    storedOverrides && typeof storedOverrides === 'object'
      ? (storedOverrides as TierOverrides)
      : {};
  const theme: LoyaltyTheme =
    storedTheme && typeof storedTheme === 'object'
      ? { ...DEFAULT_THEME, ...(storedTheme as Partial<LoyaltyTheme>) }
      : DEFAULT_THEME;

  const claims: LoyaltyClaims = {};
  if (storedClaims) {
    for (const [k, v] of Object.entries(storedClaims)) {
      try {
        claims[k] = typeof v === 'string' ? JSON.parse(v) : (v as LoyaltyClaim);
      } catch { /* skip malformed */ }
    }
  }

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

  let currentStardust = 0;
  if (trackActive && profile) {
    currentStardust =
      profile.subMonths * MAJOR_ACTION_VALUE +
      profile.referrals * MAJOR_ACTION_VALUE +
      profile.gifts * MAJOR_ACTION_VALUE +
      (profile.isCommissioner ? MAJOR_ACTION_VALUE : 0);
  }
  const currentTier = tierForStardust(currentStardust);

  return (
    <LoyaltyClient
      signedIn={!!userId}
      isAdmin={isAdmin}
      trackActive={trackActive}
      currentStardust={currentStardust}
      currentTier={currentTier}
      initialOverrides={overrides}
      initialTiers={tiers}
      initialTheme={theme}
      initialClaims={claims}
    />
  );
}
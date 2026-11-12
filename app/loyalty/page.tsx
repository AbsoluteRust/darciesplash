// app/loyalty/page.tsx
import { auth } from '@/auth';
import { kv } from '@vercel/kv';
import { ADMIN_IDS } from '@/lib/admin';
import {
  buildAllTiers,
  isTrackActive,
  tierForStardust,
  DEFAULT_THEME,
  type LoyaltyTheme,
  type TierOverrides,
  type LoyaltyClaims,
  type LoyaltyClaim,
  type PendingLoyaltyPack,
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

  const [storedOverrides, storedTheme, storedClaims, stardustRaw, pendingRaw] = await Promise.all([
    kv.get('loyalty_tiers').catch(() => null),
    kv.get('loyalty_theme').catch(() => null),
    userId ? kv.hgetall(`loyalty_claims:${userId}`).catch(() => null) : Promise.resolve(null),
    userId ? kv.hget('user_stardust', userId).catch(() => null) : Promise.resolve(null),
    userId ? kv.hgetall(`user_loyalty_packs:${userId}`).catch(() => null) : Promise.resolve(null),
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
      try { claims[k] = typeof v === 'string' ? JSON.parse(v) : (v as LoyaltyClaim); }
      catch { /* skip */ }
    }
  }

  const pendingPacks: Record<string, PendingLoyaltyPack> = {};
  if (pendingRaw) {
    for (const [k, v] of Object.entries(pendingRaw)) {
      try { pendingPacks[k] = typeof v === 'string' ? JSON.parse(v) : (v as PendingLoyaltyPack); }
      catch { /* skip */ }
    }
  }

  const tiers = buildAllTiers(overrides);
  const trackActive = isTrackActive();

  const currentStardust = trackActive ? (Number(stardustRaw) || 0) : 0;
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
      initialPendingPacks={pendingPacks}
    />
  );
}
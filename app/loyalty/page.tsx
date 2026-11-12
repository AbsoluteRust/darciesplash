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
  const botUrl = (process.env.PI_BOT_URL || '').replace(/\/$/, '');

  // Tier overrides + theme are public/admin data. Pending packs and
  // stardust come from the bot — the website never reads card data
  // from KV directly.
  const [storedOverrides, storedTheme, storedClaims] = await Promise.all([
    kv.get('loyalty_tiers').catch(() => null),
    kv.get('loyalty_theme').catch(() => null),
    userId ? kv.hgetall(`loyalty_claims:${userId}`).catch(() => null) : Promise.resolve(null),
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

  let pendingPacks: PendingLoyaltyPack[] = [];
  let currentStardust = 0;

  if (userId && botUrl) {
    const auth = { Authorization: `Bearer ${process.env.PI_BOT_SECRET}` };
    const [pendingRes, stardustRes] = await Promise.allSettled([
      fetch(`${botUrl}/api/loyalty/pending-packs?userId=${userId}`, { headers: auth, cache: 'no-store' }),
      fetch(`${botUrl}/api/user/stardust?userId=${userId}`, { headers: auth, cache: 'no-store' }),
    ]);

    if (pendingRes.status === 'fulfilled' && pendingRes.value.ok) {
      const data = await pendingRes.value.json().catch(() => ({}));
      if (Array.isArray(data?.packs)) {
        pendingPacks = data.packs.filter((p: any) =>
          p && typeof p.id === 'string' && typeof p.packName === 'string'
        );
      }
    }

    // Stardust: read directly from KV — bot writes to `user_stardust`.
    // (This is fine; stardust is not secret, it's just the balance.)
    const stardustRaw = await kv.hget('user_stardust', userId).catch(() => null);
    currentStardust = Number(stardustRaw) || 0;
  }

  const tiers = buildAllTiers(overrides);
  const trackActive = isTrackActive();
  if (!trackActive) currentStardust = 0;
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
// app/loyalty/page.tsx
import { auth } from '@/auth';
import { kv } from '@vercel/kv';
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
    const manualMonths = Number(b.sub_months || 0);
    const kofiMonths = Number(kofiData?.months || 0);

    profile = {
      subMonths: Math.max(manualMonths, kofiMonths),
      referrals: Number(b.referrals || 0),
      gifts: Number(b.gifts || 0),
      isCommissioner: !!r.commissioner,
    };
  }

  return (
    <div className="loyalty-page">
      <div className="loyalty-header">
        <h1 className="loyalty-title">Your Loyalty Journey</h1>
        <p className="loyalty-subtitle">
          Drag through the stars to explore every milestone you&apos;ve reached — and the ones still ahead.
        </p>
      </div>
      <LoyaltyClient signedIn={!!userId} profile={profile} />
    </div>
  );
}
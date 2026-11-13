// app/darsubscribbler/page.tsx
import { auth } from '@/auth';
import { kv } from '@vercel/kv';
import { DARSUBSCRIBBLER_FEATURES } from '@/lib/darsubscriber-features';
import DarsubscriberStatus from './DarsubscriberStatus';
import DarsubscriberCTA from './DarsubscriberCTA';
import './page.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Darsubscriber',
  description: 'Everything you get as a Darsubscribbler on Folly of Flora.',
};

const KOFI_TIERS_URL = 'https://ko-fi.com/dardotdlc/tiers';

export default async function DarsubscriberPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  let realIsDarsubscriber = false;
  if (userId) {
    const roles = await kv.get(`account_roles:${userId}`).catch(() => null);
    realIsDarsubscriber = !!(roles as any)?.darsubscribbler;
  }

  return (
    <main className="ds-page">
      <section className="ds-hero">
        <div className="ds-hero__inner">
          <p className="ds-hero__eyebrow">Support the studio</p>
          <h1 className="ds-hero__title">Darsubscriber</h1>
          <p className="ds-hero__subtitle">
            Every perk below is unlocked automatically the moment your
            Darsubscribbler status becomes active. No codes, no waiting, no
            extra signup.
          </p>

          <DarsubscriberStatus
            signedIn={!!userId}
            realIsDarsubscriber={realIsDarsubscriber}
            kofiUrl={KOFI_TIERS_URL}
          />
        </div>
      </section>

      <section className="ds-features">
        <h2 className="ds-section-title">What you get</h2>
        <div className="ds-features__grid">
          {DARSUBSCRIBBLER_FEATURES.map(feature => (
            <article key={feature.id} className="ds-feature">
              <div className="ds-feature__icon" aria-hidden="true">
                {feature.icon}
              </div>
              <h3 className="ds-feature__title">{feature.title}</h3>
              <p className="ds-feature__body">{feature.description}</p>
              {feature.location && (
                <p className="ds-feature__location">{feature.location}</p>
              )}
            </article>
          ))}
        </div>
      </section>

      <DarsubscriberCTA
        realIsDarsubscriber={realIsDarsubscriber}
        kofiUrl={KOFI_TIERS_URL}
      />
    </main>
  );
}
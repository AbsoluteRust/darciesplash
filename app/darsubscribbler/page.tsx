// app/darsubscribbler/page.tsx
import './page.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Darsubscriber',
  description: 'Everything you get as a Darsubscriber on Folly of Flora.',
};

export default function DarsubscriberPage() {
  return (
    <main className="ds-page">
      <section className="ds-hero">
        <div className="ds-hero__inner">
          <p className="ds-hero__eyebrow">Diagnostic</p>
          <h1 className="ds-hero__title">Darsubscriber</h1>
          <p className="ds-hero__subtitle">
            If you can read this, page.tsx itself is fine.
          </p>
        </div>
      </section>
    </main>
  );
}
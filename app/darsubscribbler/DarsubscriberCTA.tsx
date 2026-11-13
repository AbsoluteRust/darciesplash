// app/darsubscribbler/DarsubscriberCTA.tsx
'use client';

import { usePreviewMode } from '@/components/PreviewModeContext';

export default function DarsubscriberCTA({
  realIsDarsubscriber,
  kofiUrl,
}: {
  realIsDarsubscriber: boolean;
  kofiUrl: string;
}) {
  const { effectiveIsDarsubscriber } = usePreviewMode();

  return (
    <section className="ds-cta">
      <div className="ds-cta__inner">
        <h2 className="ds-cta__title">
          {effectiveIsDarsubscriber ? 'You’re all set.' : 'Ready to unlock everything?'}
        </h2>
        <p className="ds-cta__subtitle">
          {effectiveIsDarsubscriber
            ? 'Every perk above is active on your account right now. Thank you for supporting the studio.'
            : 'Darsubscribbler status is managed through Ko-fi. Cancel any time — your perks stay active until your billing period ends.'}
        </p>
        {!effectiveIsDarsubscriber && (
          <a
            className="ds-cta__button"
            href={kofiUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Become a Darsubscribbler →
          </a>
        )}
      </div>
    </section>
  );
}
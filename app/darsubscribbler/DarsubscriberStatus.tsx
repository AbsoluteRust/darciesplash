// app/darsubscribbler/DarsubscriberStatus.tsx
'use client';

import { signIn } from 'next-auth/react';
import { usePreviewMode } from '@/components/PreviewModeContext';

export default function DarsubscriberStatus({
  signedIn,
  realIsDarsubscriber,
  kofiUrl,
}: {
  signedIn: boolean;
  realIsDarsubscriber: boolean;
  kofiUrl: string;
}) {
  const { effectiveIsDarsubscriber } = usePreviewMode();

  if (!signedIn) {
    return (
      <div className="ds-status ds-status--signin">
        <p className="ds-status__title">Sign in to check your status</p>
        <p className="ds-status__body">
          Already a Darsubscribbler? Sign in to see every perk that&apos;s
          already unlocked on your account.
        </p>
        <button
          type="button"
          className="ds-status__button"
          onClick={() => signIn('discord', { callbackUrl: '/darsubscribbler' })}
        >
          Sign in with Discord
        </button>
      </div>
    );
  }

  if (effectiveIsDarsubscriber) {
    return (
      <div className="ds-status ds-status--active">
        <p className="ds-status__title">
          <span aria-hidden="true">✦</span> You are a Darsubscribbler
        </p>
        <p className="ds-status__body">
          Every perk on this page is active on your account right now. Thank
          you for supporting the studio.
        </p>
      </div>
    );
  }

  return (
    <div className="ds-status ds-status--inactive">
      <p className="ds-status__title">You are not currently a Darsubscribbler</p>
      <p className="ds-status__body">
        Become a Darsubscribbler on Ko-fi to unlock every perk on this page.
        Darsubscribbler status is applied automatically — no codes to redeem,
        no waiting.
      </p>
      <a
        className="ds-status__button"
        href={kofiUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Become a Darsubscribbler →
      </a>
    </div>
  );
}
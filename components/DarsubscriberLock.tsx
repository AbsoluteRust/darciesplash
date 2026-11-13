// components/DarsubscriberLock.tsx
'use client';

import { useEffect, useId, useRef, useState } from 'react';
import './DarsubscriberLock.css';

const KOFI_TIERS_URL = 'https://ko-fi.com/dardotdlc/tiers';

export default function DarsubscriberLock({
  feature,
  description,
  unlocked,
  children,
  variant = 'overlay',
  tooltipPlacement = 'below',
  kofiUrl = KOFI_TIERS_URL,
}: {
  feature: string;
  description: string;
  unlocked: boolean;
  children: React.ReactNode;
  variant?: 'overlay' | 'inline';
  tooltipPlacement?: 'below' | 'above';
  kofiUrl?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(e.target as Node)) return;
      setOpen(false);
      setPinned(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setPinned(false); }
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (unlocked) return <>{children}</>;

  const cancelClose = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  };
  const scheduleClose = () => {
    if (pinned) return;
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 200);
  };

  const handleBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (open && pinned) { setPinned(false); setOpen(false); }
    else { setOpen(true); setPinned(true); }
  };

  return (
    <div
      className={`dsl-wrapper dsl-wrapper--${variant}`}
      ref={wrapperRef}
      onMouseEnter={() => { cancelClose(); setOpen(true); }}
      onMouseLeave={scheduleClose}
    >
      <div className="dsl-locked" aria-disabled="true">
        {children}
        <div className="dsl-veil" />
      </div>

      <button
        type="button"
        className="dsl-badge"
        aria-label={`${feature} — Darsubscribbler feature. Click for details.`}
        aria-expanded={open}
        aria-controls={open ? tooltipId : undefined}
        onClick={handleBadgeClick}
        onFocus={() => { cancelClose(); setOpen(true); }}
        onBlur={scheduleClose}
      >
        <span className="dsl-badge__lock" aria-hidden="true">🔒</span>
        <span className="dsl-badge__text">Darsubscriber</span>
      </button>

      {open && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`dsl-tooltip${tooltipPlacement === 'above' ? ' dsl-tooltip--above' : ''}`}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className="dsl-tooltip__title">{feature}</div>
          <div className="dsl-tooltip__body">{description}</div>
          <a
            className="dsl-tooltip__cta"
            href={kofiUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Become a Darsubscribbler →
          </a>
          <div className="dsl-tooltip__hint">
            Darsubscribblers get this and every other perk on the{' '}
            <a href="/darsubscribbler">Darsubscriber page</a>.
          </div>
        </div>
      )}
    </div>
  );
}
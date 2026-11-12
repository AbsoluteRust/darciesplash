// components/PointsHelpTooltip.tsx
'use client';

import { useEffect, useId, useRef, useState } from 'react';
import './PointsHelpTooltip.css';

// Mirrors RARITY_CARD_VALUE in bot config.js. Contraband is 0 by design —
// it contributes nothing to collector score in lib/collection.js.
const RARITY_VALUES: { rarity: string; emoji: string; value: number }[] = [
  { rarity: 'Common',     emoji: '⚪', value: 100 },
  { rarity: 'Uncommon',   emoji: '🟢', value: 250 },
  { rarity: 'Rare',       emoji: '🔵', value: 600 },
  { rarity: 'Epic',       emoji: '🟣', value: 1_400 },
  { rarity: 'Legendary',  emoji: '🟡', value: 3_050 },
  { rarity: 'Mythic',     emoji: '🔴', value: 6_400 },
  { rarity: 'Contraband', emoji: '⬛', value: 0 },
];

// Mirrors SCORE_TABLE (min 20, max 27) + MESSAGE_COOLDOWN_MS (3000)
// + REACTION_COOLDOWN_MS (1000) from bot config.js.
const EMOTE_MIN = 20;
const EMOTE_MAX = 27;
const MESSAGE_CD_S = 3;
const REACTION_CD_S = 1;

export type PointsKind = 'pack-points' | 'collector-points';

export default function PointsHelpTooltip({
  kind,
  children,
}: {
  kind: PointsKind;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
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
      if (e.key === 'Escape') {
        setOpen(false);
        setPinned(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    if (pinned) return;
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 220);
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (open && pinned) {
      setPinned(false);
      setOpen(false);
    } else {
      setOpen(true);
      setPinned(true);
    }
  };

  return (
    <span
      className="phv-wrapper"
      ref={wrapperRef}
      onMouseEnter={() => { cancelClose(); setOpen(true); }}
      onMouseLeave={scheduleClose}
    >
      <span className="phv-value">{children}</span>
      <button
        type="button"
        className="phv-trigger"
        aria-label={
          kind === 'pack-points'
            ? 'How to earn pack points'
            : 'How to earn collector points'
        }
        aria-expanded={open}
        aria-controls={open ? tooltipId : undefined}
        title="How to earn more"
        onClick={handleButtonClick}
        onFocus={() => { cancelClose(); setOpen(true); }}
        onBlur={scheduleClose}
      >
        ?
      </button>

      {open && (
        <div
          id={tooltipId}
          role="tooltip"
          className="phv-tooltip"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          {kind === 'pack-points' ? <PackPointsContent /> : <CollectorPointsContent />}
        </div>
      )}
    </span>
  );
}

function PackPointsContent() {
  return (
    <div className="phv-content">
      <div className="phv-header">How to earn pack points</div>

      <div className="phv-section phv-section--countdown">
        <div className="phv-section__title">Daily payout</div>
        <div className="phv-countdown">
          <span className="phv-countdown__label">Next in</span>
          <span className="phv-countdown__value"><Countdown /></span>
        </div>
        <div className="phv-section__hint">
          Awarded automatically once per UTC day, shortly after midnight.
        </div>
      </div>

      <div className="phv-section">
        <div className="phv-section__title">Use Darcie&apos;s emotes</div>
        <div className="phv-section__body">
          Use any emote from Darcie&apos;s collection in a channel the bot can see.
          Earns around <strong>{EMOTE_MIN}&ndash;{EMOTE_MAX}</strong> points.
        </div>
      </div>

      <div className="phv-section">
        <div className="phv-section__title">Open packs with friends</div>
        <div className="phv-section__body">
          Join a <strong>With Friends</strong> lobby on <code>/play</code>. Open packs
          together with up to 4 others and share bonus loot payouts.
        </div>
      </div>

      <div className="phv-section phv-section--soon">
        <div className="phv-section__title">Fishing 🎣</div>
        <div className="phv-section__body">Coming soon — a new way to earn pack points.</div>
      </div>
    </div>
  );
}

function CollectorPointsContent() {
  return (
    <div className="phv-content">
      <div className="phv-header">How to earn collector points</div>

      <div className="phv-section">
        <div className="phv-section__body">
          Each <strong>unique</strong> card you own counts once, based on its rarity.
          Extra copies of the same card don&apos;t add more.
        </div>
      </div>

      <table className="phv-rarity-table">
        <tbody>
          {RARITY_VALUES.map(({ rarity, emoji, value }) => (
            <tr key={rarity}>
              <td className="phv-rarity-table__emoji">{emoji}</td>
              <td className="phv-rarity-table__name">{rarity}</td>
              <td className="phv-rarity-table__value">
                {value === 0 ? '—' : value.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="phv-section__hint">
        Rarities showing &mdash; don&apos;t contribute to collector points.
      </div>
    </div>
  );
}

function Countdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remaining = Math.max(0, nextUtcMidnight(now) - now);
  const totalSec = Math.floor(remaining / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return (
    <span>
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

function nextUtcMidnight(now: number): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0);
}
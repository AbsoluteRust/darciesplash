'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import PackReveal from './PackReveal';

const HOLD_MS = 2000;

type Status = 'idle' | 'opening' | 'done' | 'error';

export type PackCard = {
  name: string;
  parentName: string | null;
  rarity: string;
  collection: string;
  type: string;
  imageUrl: string;
  rawImageUrl?: string;
  isChroma: boolean;
  isContraband: boolean;
  contrabandArtist: string | null;
  color: string;
  emoji: string;
  thumbUrl?: string | null;
  description?: string;
  details?: string;
  link?: string;
};

export default function PlayButton({ disabled = false }: { disabled?: boolean }) {
  const [progress, setProgress] = useState(0);
  const [charging, setCharging] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [reveal, setReveal] = useState<PackCard[] | null>(null);
  const [shortId, setShortId] = useState<string | null>(null);
  const [canReroll, setCanReroll] = useState(false);

  const holdStartRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const chargingRef = useRef(false);
  const statusRef = useRef<Status>('idle');
  statusRef.current = status;

  const stopRaf = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const beginHold = useCallback(() => {
    if (disabled) return; // <-- Prevents starting if group is active
    if (statusRef.current === 'opening') return;
    if (chargingRef.current) return;

    chargingRef.current = true;
    setCharging(true);
    setMessage(null);

    holdStartRef.current = performance.now();
    progressRef.current = 0;
    setProgress(0);

    const tick = (now: number) => {
      const p = Math.min(1, (now - holdStartRef.current) / HOLD_MS);
      progressRef.current = p;
      setProgress(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [disabled]);

  const endHold = useCallback(async () => {
    if (!chargingRef.current) return;
    chargingRef.current = false;
    setCharging(false);
    stopRaf();

    const reached = progressRef.current >= 1;
    progressRef.current = 0;
    setProgress(0);

    if (!reached) return;

    setStatus('opening');
    try {
      const res = await fetch('/api/open-pack', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);

      setStatus('done');
      setMessage('Pack opened — check the game channel!');
      if (Array.isArray(data.cards) && data.cards.length > 0) {
        setReveal(data.cards);
        setShortId(data.shortId);
        setCanReroll(data.allCommon);
      }
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong');
    }
  }, []);

  useEffect(() => {
    const isTextField = (t: EventTarget | null) =>
      t instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);

    const onKeyDown = (e: KeyboardEvent) => {
      if (disabled) return; // <-- Blocks spacebar if group is active
      if (e.code !== 'Space') return;
      if (isTextField(e.target)) return;
      e.preventDefault();
      if (e.repeat) return;
      if (reveal) return;
      beginHold();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      if (isTextField(e.target)) return;
      e.preventDefault();
      endHold();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [beginHold, endHold, reveal, disabled]);

  const full = progress >= 1;
  const shaking = charging && progress > 0;

  const label = disabled 
    ? 'Group session active'
    : status === 'opening'
    ? 'Opening…'
    : full
    ? 'Release to open!'
    : 'Hold spacebar to open';

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
            beginHold();
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            endHold();
          }}
          onPointerCancel={() => { if (chargingRef.current) endHold(); }}
          onContextMenu={(e) => e.preventDefault()}
          disabled={disabled || status === 'opening' || !!reveal}
          className={[
            'relative select-none touch-none overflow-hidden rounded-3xl',
            'w-64 sm:w-72 md:w-80 aspect-[3/4]', 
            'shadow-2xl transition-all duration-200',
            'bg-gradient-to-br from-indigo-600 via-purple-700 to-violet-900',
            'ring-1 ring-white/20',
            shaking ? 'animate-[playShake_0.12s_infinite]' : '',
            
            // Updated styling for disabled state
            disabled ? 'opacity-40 grayscale cursor-not-allowed border border-white/10' : 
            status === 'opening' || reveal ? 'opacity-70 cursor-wait' : 
            'cursor-pointer hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(99,102,241,0.4)]',
          ].join(' ')}
        >
          {/* Removed the CSS transition here so it tracks the JS state instantly */}
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 bg-white/40 shadow-[0_0_20px_rgba(255,255,255,0.7)] z-0"
            style={{ width: `${progress * 100}%` }}
          />

          {/* Center Icon (Pack styling) */}
          <span className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <span className={`text-7xl font-black select-none drop-shadow-xl transition-colors duration-200 ${full ? 'text-white' : 'text-white/30'}`}>
              ?
            </span>
          </span>
        </button>

        {/* Text moved below the button */}
        <span className={`text-lg font-bold tracking-wide ${disabled ? 'text-white/40' : 'text-white/80'}`}>
          {label}
        </span>

        {message && (
          <p className={status === 'error' ? 'text-sm text-red-400' : 'text-sm text-emerald-400'}>
            {message}
          </p>
        )}
      </div>

      {reveal && shortId && (
        <PackReveal 
          cards={reveal} 
          shortId={shortId}
          canReroll={canReroll}
          onClose={() => {
            setReveal(null);
            setShortId(null);
            setCanReroll(false);
          }} 
        />
      )}
    </>
  );
}
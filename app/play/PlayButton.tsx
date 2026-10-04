'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const HOLD_MS = 2000;

type Status = 'idle' | 'opening' | 'done' | 'error';

export default function PlayButton() {
  const [progress, setProgress] = useState(0);
  const [charging, setCharging] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);

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
  }, []);

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
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong');
    }
  }, []);

  useEffect(() => {
    const isTextField = (t: EventTarget | null) =>
      t instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      if (isTextField(e.target)) return;
      e.preventDefault();
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
  }, [beginHold, endHold]);

  const full = progress >= 1;
  const shaking = charging && progress > 0;

  return (
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
        disabled={status === 'opening'}
        className={[
          'relative select-none touch-none overflow-hidden rounded-2xl px-12 py-6',
          'text-xl font-bold text-white shadow-lg transition',
          'bg-gradient-to-r from-indigo-500 to-violet-500',
          shaking ? 'animate-[playShake_0.12s_infinite]' : '',
          status === 'opening' ? 'opacity-70 cursor-wait' : 'cursor-pointer',
        ].join(' ')}
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 bg-white/35"
          style={{ width: `${progress * 100}%` }}
        />
        <span className="relative z-10">
          {status === 'opening'
            ? 'Opening…'
            : full
            ? 'Release to open!'
            : 'Hold spacebar to open'}
        </span>
      </button>

      {message && (
        <p className={status === 'error' ? 'text-sm text-red-400' : 'text-sm text-emerald-400'}>
          {message}
        </p>
      )}
    </div>
  );
}
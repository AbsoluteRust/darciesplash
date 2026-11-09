// app/loyalty/LoyaltyClient.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildAllTiers,
  TOTAL_TIERS,
  TOTAL_TRACK_COST,
  tierForStardust,
  type MergedTier,
  type TierOverrides,
} from '@/lib/loyalty-milestones';

const WORLD_WIDTH = 16000;
const START_X = 2400;
const END_X = 13600;
const PADDING = 300;

/* ---------- wave math ---------- */

function mainStringY(x: number, t: number, height: number): number {
  const center = height / 2;
  const waveAmp = Math.min(50, height * 0.15);
  return center
    + Math.sin(x / 420 + t * 0.4) * waveAmp
    + Math.cos(x / 680 + t * 0.3) * (waveAmp * 0.5)
    + Math.sin(x / 300 + t * 0.7) * (waveAmp * 0.25);
}

const DECO_AMPS = [120, 90, 60, 150, 100];
const DECO_COLORS = ['#818cf8', '#a855f7', '#ec4899', '#22d3ee', '#3b82f6'];

function decoPathY(x: number, idx: number, t: number, height: number): number {
  const center = height / 2;
  const scale = Math.min(1, height / 600);
  const amp = DECO_AMPS[idx % DECO_AMPS.length] * scale;
  const phase = idx * 1.4;
  const speed = 0.15 + idx * 0.05;
  return center
    + Math.sin(x / 500 + phase + t * speed) * amp
    + Math.cos(x / 320 + phase * 0.7 + t * speed * 1.3) * (amp * 0.5)
    + Math.sin(x / 180 + phase * 0.3 + t * speed * 0.8) * (amp * 0.2);
}

function buildPath(fn: (x: number) => number): string {
  const step = WORLD_WIDTH / 200;
  let d = '';
  for (let i = 0; i <= 200; i++) {
    const x = i * step;
    d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + fn(x).toFixed(1) + ' ';
  }
  return d;
}

/* ---------- star sizing + colors ---------- */

function starSize(tier: number): number {
  if (tier === 100) return 96;
  if (tier >= 97) return 84;
  if (tier === 96 || tier === 90 || tier === 75 || tier === 50 || tier === 40 || tier === 39 || tier === 33 || tier === 32 || tier === 25 || tier === 20 || tier === 10) return 76;
  if (tier % 10 === 0) return 72;
  if (tier % 5 === 0) return 60;
  return 50;
}

function starPalette(tier: number, unlocked: boolean): { stroke: string; fill: string; glow: string } {
  if (!unlocked) {
    return {
      stroke: 'rgba(120, 130, 160, 0.55)',
      fill: 'rgba(30, 32, 50, 0.55)',
      glow: 'rgba(120, 130, 160, 0.15)',
    };
  }
  if (tier === 100) return { stroke: 'rgba(251, 191, 36, 0.95)', fill: 'rgba(251, 191, 36, 0.28)', glow: 'rgba(251, 191, 36, 0.75)' };
  if (tier >= 97)  return { stroke: 'rgba(244, 114, 182, 0.95)', fill: 'rgba(236, 72, 153, 0.28)', glow: 'rgba(244, 114, 182, 0.65)' };
  if (tier % 10 === 0) return { stroke: 'rgba(167, 139, 250, 0.95)', fill: 'rgba(139, 92, 246, 0.28)', glow: 'rgba(167, 139, 250, 0.65)' };
  if (tier % 5 === 0) return { stroke: 'rgba(147, 197, 253, 0.9)', fill: 'rgba(96, 165, 250, 0.22)', glow: 'rgba(147, 197, 253, 0.55)' };
  return { stroke: 'rgba(196, 181, 253, 0.85)', fill: 'rgba(139, 92, 246, 0.18)', glow: 'rgba(196, 181, 253, 0.5)' };
}

function StarSVG({ tier, size, unlocked }: { tier: number; size: number; unlocked: boolean }) {
  const pal = starPalette(tier, unlocked);
  const haloId = `halo-t${tier}-${unlocked ? 'u' : 'l'}`;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="loyalty-star-svg" aria-hidden="true">
      <defs>
        <radialGradient id={haloId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={pal.glow} stopOpacity="0.95" />
          <stop offset="55%" stopColor={pal.glow} stopOpacity="0.25" />
          <stop offset="100%" stopColor={pal.glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#${haloId})`} className={unlocked ? 'loyalty-star-halo' : ''} />
      <polygon
        points="50,8 62,40 96,40 68,60 79,93 50,74 21,93 32,60 4,40 38,40"
        fill={pal.fill}
        stroke={pal.stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---------- edit modal ---------- */

function EditTierModal({
  tier,
  onSave,
  onClose,
}: {
  tier: MergedTier;
  onSave: (updated: MergedTier) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    icon: tier.icon,
    title: tier.title,
    description: tier.description,
    reward: tier.reward,
  });
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    if (!form.title.trim()) return setError('Title is required');
    if (!form.reward.trim()) return setError('Reward is required');
    setError(null);
    onSave({ ...tier, ...form });
  }

  return (
    <div className="loyalty-modal-overlay" onClick={onClose}>
      <div className="loyalty-modal loyalty-modal--edit" onClick={e => e.stopPropagation()}>
        <button className="loyalty-modal__close" onClick={onClose} aria-label="Close">×</button>
        <div className="loyalty-modal__body" style={{ textAlign: 'left' }}>
          <div className="loyalty-modal__eyebrow">
            Tier {tier.tier} · {tier.stardustRequired.toLocaleString()} stardust
          </div>
          <h2 className="loyalty-modal__title">Edit Tier {tier.tier}</h2>

          <div className="loyalty-form">
            <label className="loyalty-field loyalty-field--icon">
              <span>Icon</span>
              <input
                type="text"
                maxLength={4}
                value={form.icon}
                onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                className="loyalty-field__icon"
              />
            </label>

            <label className="loyalty-field loyalty-field--full">
              <span>Title</span>
              <input
                type="text"
                maxLength={100}
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </label>

            <label className="loyalty-field loyalty-field--full">
              <span>Description</span>
              <textarea
                rows={2}
                maxLength={500}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </label>

            <label className="loyalty-field loyalty-field--full">
              <span>Reward</span>
              <textarea
                rows={2}
                maxLength={300}
                value={form.reward}
                onChange={e => setForm(f => ({ ...f, reward: e.target.value }))}
              />
            </label>
          </div>

          {error && <p className="loyalty-form__error">{error}</p>}

          <div className="loyalty-form__actions">
            <button type="button" className="loyalty-btn" onClick={onClose}>Cancel</button>
            <button type="button" className="loyalty-btn loyalty-btn--primary" onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- main component ---------- */

export default function LoyaltyClient({
  signedIn,
  isAdmin,
  trackActive,
  currentStardust,
  currentTier,
  initialOverrides,
  initialTiers,
}: {
  signedIn: boolean;
  isAdmin: boolean;
  trackActive: boolean;
  currentStardust: number;
  currentTier: number;
  initialOverrides: TierOverrides;
  initialTiers: MergedTier[];
}) {
  const [overrides, setOverrides] = useState<TierOverrides>(initialOverrides);
  const tiers = useMemo(() => buildAllTiers(overrides), [overrides]);

  const [panOffset, setPanOffset] = useState(6000);
  const [viewportSize, setViewportSize] = useState({ width: 1200, height: 600 });
  const [activeTier, setActiveTier] = useState<MergedTier | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [editing, setEditing] = useState<MergedTier | null>(null);
  const [previewStardust, setPreviewStardust] = useState<number | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const panOffsetRef = useRef(panOffset);
  const viewportHeightRef = useRef(600);
  const dragRef = useRef({ dragging: false, startX: 0, startOffset: 0, moved: 0 });
  const frozenRef = useRef(false);

  const mainPathRef = useRef<SVGPathElement>(null);
  const decoPathRefs = useRef<(SVGPathElement | null)[]>([]);
  const nodeRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  /* ---------- lock body scroll ---------- */

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyPaddingRight = document.body.style.paddingRight;

    // Compensate for scrollbar disappearance
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.paddingRight = prevBodyPaddingRight;
    };
  }, []);

  /* ---------- viewport size ---------- */

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setViewportSize({ width: rect.width, height: rect.height });
      viewportHeightRef.current = rect.height;
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { panOffsetRef.current = panOffset; }, [panOffset]);

  /* ---------- positioning ---------- */

  const positioned = useMemo(() => {
    return tiers.map((t, i) => {
      const ratio = TOTAL_TIERS > 1 ? i / (TOTAL_TIERS - 1) : 0.5;
      return { ...t, x: START_X + ratio * (END_X - START_X) };
    });
  }, [tiers]);

  const positionedRef = useRef(positioned);
  useEffect(() => { positionedRef.current = positioned; }, [positioned]);

  const clampOffset = useCallback((offset: number): number => {
    const minOffset = PADDING;
    const maxOffset = Math.max(minOffset, WORLD_WIDTH - viewportSize.width - PADDING);
    return Math.max(minOffset, Math.min(maxOffset, offset));
  }, [viewportSize.width]);

  useEffect(() => {
    if (viewportSize.width <= 0) return;
    const centerX = (START_X + END_X) / 2;
    setPanOffset(clampOffset(centerX - viewportSize.width / 2));
  }, [viewportSize.width, clampOffset]);

  /* ---------- effective stardust (preview or real) ---------- */

  const effectiveStardust = previewStardust ?? (trackActive ? currentStardust : 0);
  const effectiveTier = tierForStardust(effectiveStardust);
  const effectiveTierRef = useRef(effectiveTier);
  useEffect(() => { effectiveTierRef.current = effectiveTier; }, [effectiveTier]);

  /* ---------- animation loop ---------- */

  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let mainT = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const isFrozen = frozenRef.current || activeTier !== null || editing !== null;
      if (!isFrozen) mainT += dt;

      const decoT = (now - startTime) / 1000;
      const height = viewportHeightRef.current;

      decoPathRefs.current.forEach((el, i) => {
        if (el) el.setAttribute('d', buildPath(x => decoPathY(x, i, decoT, height)));
      });

      if (mainPathRef.current) {
        mainPathRef.current.setAttribute('d', buildPath(x => mainStringY(x, mainT, height)));
      }

      positionedRef.current.forEach(m => {
        const el = nodeRefs.current.get(m.tier);
        if (el) el.style.top = `${mainStringY(m.x, mainT, height)}px`;
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- pan ---------- */

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragRef.current = { dragging: true, startX: e.clientX, startOffset: panOffsetRef.current, moved: 0 };
    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current.dragging) return;
      const dx = ev.clientX - dragRef.current.startX;
      dragRef.current.moved = Math.max(dragRef.current.moved, Math.abs(dx));
      if (dragRef.current.moved > 5) {
        setPanOffset(clampOffset(dragRef.current.startOffset - dx));
      }
    };
    const onUp = () => {
      dragRef.current.dragging = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [clampOffset]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      setPanOffset(o => clampOffset(o + delta));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [clampOffset]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); setPanOffset(o => clampOffset(o - 200)); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setPanOffset(o => clampOffset(o + 200)); }
  }, [clampOffset]);

  /* ---------- click ---------- */

  const handleNodeClick = useCallback((t: MergedTier) => {
    if (dragRef.current.moved > 5) return;
    if (adminMode) setEditing(t);
    else setActiveTier(t);
  }, [adminMode]);

  /* ---------- admin save ---------- */

  const saveOverrides = useCallback(async (next: TierOverrides) => {
    const res = await fetch('/api/loyalty/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ overrides: next }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    setOverrides(data.overrides);
  }, []);

  const handleEditSave = useCallback(async (updated: MergedTier) => {
    const next: TierOverrides = {
      ...overrides,
      [String(updated.tier)]: {
        icon: updated.icon,
        title: updated.title,
        description: updated.description,
        reward: updated.reward,
      },
    };
    try {
      await saveOverrides(next);
      setEditing(null);
    } catch (err: any) {
      alert('Failed to save: ' + err.message);
    }
  }, [overrides, saveOverrides]);

  /* ---------- escape ---------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (editing) setEditing(null);
      else if (activeTier) setActiveTier(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeTier, editing]);

  /* ---------- render ---------- */

  return (
    <div className="loyalty-stage">
      {!trackActive && (
        <div className="loyalty-banner">
          <span className="loyalty-banner__icon">🌌</span>
          <span>Loyalty progression begins <strong>January 1, 2027</strong>. You can explore every tier and its reward now.</span>
        </div>
      )}

      {trackActive && signedIn && (
        <div className="loyalty-progress-bar">
          <div className="loyalty-progress-bar__text">
            <span className="loyalty-progress-bar__label">Stardust</span>
            <span className="loyalty-progress-bar__value">
              {effectiveStardust.toLocaleString()} / {TOTAL_TRACK_COST.toLocaleString()}
            </span>
            <span className="loyalty-progress-bar__tier">
              Tier {effectiveTier} / {TOTAL_TIERS}
            </span>
          </div>
          <div className="loyalty-progress-bar__track">
            <div
              className="loyalty-progress-bar__fill"
              style={{ width: `${Math.min(100, (effectiveStardust / TOTAL_TRACK_COST) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="loyalty-admin-bar">
          <button
            type="button"
            className={`loyalty-admin-toggle ${adminMode ? 'is-on' : ''}`}
            onClick={() => setAdminMode(v => !v)}
          >
            {adminMode ? '✕ Exit edit mode' : '⚙️ Edit tiers'}
          </button>
          <div className="loyalty-admin-preview">
            <label htmlFor="preview-stardust">Preview stardust</label>
            <input
              id="preview-stardust"
              type="number"
              min={0}
              max={TOTAL_TRACK_COST}
              placeholder={trackActive ? String(currentStardust) : '0'}
              value={previewStardust ?? ''}
              onChange={e => {
                const v = e.target.value.trim();
                setPreviewStardust(v === '' ? null : Math.max(0, Math.min(TOTAL_TRACK_COST, Number(v) || 0)));
              }}
            />
            <button
              type="button"
              className="loyalty-admin-reset"
              onClick={() => setPreviewStardust(null)}
              disabled={previewStardust === null}
            >
              Reset
            </button>
          </div>
        </div>
      )}

      <div
        ref={viewportRef}
        className={`loyalty-viewport ${adminMode ? 'is-editing' : ''}`}
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label="Loyalty tier track"
      >
        <div className="loyalty-edge-fade loyalty-edge-fade--left" />
        <div className="loyalty-edge-fade loyalty-edge-fade--right" />

        <div className="loyalty-world" style={{ transform: `translateX(${-panOffset}px)` }}>
          <svg
            className="loyalty-svg"
            width={WORLD_WIDTH}
            height={viewportSize.height}
            viewBox={`0 0 ${WORLD_WIDTH} ${viewportSize.height}`}
            aria-hidden="true"
          >
            <defs>
              {DECO_COLORS.map((color, i) => (
                <linearGradient key={i} id={`deco-grad-${i}`} x1="0" y1="0" x2={WORLD_WIDTH} y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="transparent" />
                  <stop offset="15%" stopColor={color} stopOpacity="0.12" />
                  <stop offset="50%" stopColor={color} stopOpacity="0.28" />
                  <stop offset="85%" stopColor={color} stopOpacity="0.12" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              ))}
              <linearGradient id="main-grad" x1="0" y1="0" x2={WORLD_WIDTH} y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="10%" stopColor="#8b5cf6" stopOpacity="0.35" />
                <stop offset="50%" stopColor="#c4b5fd" stopOpacity="1" />
                <stop offset="90%" stopColor="#8b5cf6" stopOpacity="0.35" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
              <filter id="loyalty-glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {DECO_COLORS.map((_, i) => (
              <path
                key={i}
                ref={el => { decoPathRefs.current[i] = el; }}
                fill="none"
                stroke={`url(#deco-grad-${i})`}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            <path
              ref={mainPathRef}
              fill="none"
              stroke="url(#main-grad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#loyalty-glow)"
            />
          </svg>

          {positioned.map(m => {
            const unlocked = m.tier <= effectiveTier;
            const size = starSize(m.tier);
            const showLabel = m.tier === 100 || m.tier % 5 === 0;
            return (
              <button
                key={m.tier}
                type="button"
                className={`loyalty-node ${unlocked ? 'is-unlocked' : 'is-locked'} ${adminMode ? 'is-editable' : ''}`}
                style={{ left: m.x, top: mainStringY(m.x, 0, viewportSize.height), transform: 'translate(-50%, -50%)' }}
                ref={el => {
                  if (el) nodeRefs.current.set(m.tier, el);
                  else nodeRefs.current.delete(m.tier);
                }}
                onPointerEnter={() => { frozenRef.current = true; }}
                onPointerLeave={() => { frozenRef.current = false; }}
                onClick={() => handleNodeClick(m)}
                aria-label={`Tier ${m.tier}: ${m.title}${unlocked ? ' (unlocked)' : ''}`}
              >
                <span className="loyalty-node__wrap" style={{ width: size, height: size }}>
                  <StarSVG tier={m.tier} size={size} unlocked={unlocked} />
                  <span className="loyalty-node__icon">{m.icon}</span>
                </span>
                {showLabel && <span className="loyalty-node__label">{m.tier}</span>}
                {adminMode && <span className="loyalty-node__edit-badge">✎</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="loyalty-hint">
        {adminMode ? 'Click any star to edit its reward' : 'Drag or use arrow keys to pan'}
      </div>

      {activeTier && !adminMode && (
        <div className="loyalty-modal-overlay" onClick={() => setActiveTier(null)}>
          <div className="loyalty-modal" onClick={e => e.stopPropagation()}>
            <button className="loyalty-modal__close" onClick={() => setActiveTier(null)} aria-label="Close">×</button>
            <div className="loyalty-modal__star-big">
              <StarSVG tier={activeTier.tier} size={120} unlocked={activeTier.tier <= effectiveTier} />
              <span className="loyalty-modal__star-icon">{activeTier.icon}</span>
            </div>
            <div className="loyalty-modal__body">
              <div className="loyalty-modal__eyebrow">
                Tier {activeTier.tier} · {activeTier.stardustRequired.toLocaleString()} stardust
              </div>
              <h2 className="loyalty-modal__title">{activeTier.title}</h2>
              <p className="loyalty-modal__description">{activeTier.description}</p>
              <div className="loyalty-modal__reward">
                <div className="loyalty-modal__reward-label">Reward</div>
                <div className="loyalty-modal__reward-text">{activeTier.reward}</div>
              </div>
              {!trackActive ? (
                <div className="loyalty-modal__status loyalty-modal__status--signin">
                  Track opens January 1, 2027
                </div>
              ) : signedIn ? (
                activeTier.tier <= effectiveTier ? (
                  <div className="loyalty-modal__status loyalty-modal__status--unlocked">✓ Unlocked</div>
                ) : (
                  <div className="loyalty-modal__status loyalty-modal__status--progress">
                    <div className="loyalty-modal__progress-text">
                      {effectiveStardust.toLocaleString()} / {activeTier.stardustRequired.toLocaleString()} stardust
                    </div>
                    <div className="loyalty-modal__progress-bar">
                      <div
                        className="loyalty-modal__progress-fill"
                        style={{
                          width: `${Math.min(100, (effectiveStardust / activeTier.stardustRequired) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )
              ) : (
                <div className="loyalty-modal__status loyalty-modal__status--signin">
                  Sign in to track your progress
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editing && (
        <EditTierModal
          tier={editing}
          onSave={handleEditSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
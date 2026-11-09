// app/loyalty/LoyaltyClient.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MILESTONE_TYPES, type Milestone, type MilestoneType } from '@/lib/loyalty-milestones';

type ProfileData = {
  subMonths: number;
  referrals: number;
  gifts: number;
  isCommissioner: boolean;
};

type PositionedMilestone = Milestone & { x: number };

const WORLD_WIDTH = 10000;
const START_X = 1800;
const END_X = 8200;
const PADDING = 300;
const SVG_HEIGHT = 600;
const PATH_POINTS = 200;

/* ---------- wave math ---------- */

function mainStringY(x: number, t: number): number {
  return SVG_HEIGHT / 2
    + Math.sin(x / 420 + t * 0.4) * 50
    + Math.cos(x / 680 + t * 0.3) * 25
    + Math.sin(x / 300 + t * 0.7) * 12;
}

const DECO_AMPS = [120, 90, 60, 150, 100];
const DECO_COLORS = ['#818cf8', '#a855f7', '#ec4899', '#22d3ee', '#3b82f6'];

function decoPathY(x: number, idx: number, t: number): number {
  const amp = DECO_AMPS[idx % DECO_AMPS.length];
  const phase = idx * 1.4;
  const speed = 0.15 + idx * 0.05;
  return SVG_HEIGHT / 2
    + Math.sin(x / 500 + phase + t * speed) * amp
    + Math.cos(x / 320 + phase * 0.7 + t * speed * 1.3) * (amp * 0.5)
    + Math.sin(x / 180 + phase * 0.3 + t * speed * 0.8) * (amp * 0.2);
}

function buildPath(fn: (x: number) => number): string {
  const step = WORLD_WIDTH / PATH_POINTS;
  let d = '';
  for (let i = 0; i <= PATH_POINTS; i++) {
    const x = i * step;
    d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + fn(x).toFixed(1) + ' ';
  }
  return d;
}

/* ---------- star visual ---------- */

function StarShape({ unlocked }: { unlocked: boolean }) {
  const strokeColor = unlocked ? 'rgba(167, 139, 250, 0.95)' : 'rgba(110, 110, 140, 0.55)';
  const fillColor = unlocked ? 'rgba(139, 92, 246, 0.25)' : 'rgba(30, 30, 50, 0.4)';
  const haloId = unlocked ? 'halo-active' : 'halo-inactive';
  return (
    <svg viewBox="0 0 100 100" className="loyalty-star-svg" aria-hidden="true">
      <defs>
        <radialGradient id="halo-active" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(167, 139, 250, 0.75)" />
          <stop offset="55%" stopColor="rgba(139, 92, 246, 0.2)" />
          <stop offset="100%" stopColor="rgba(139, 92, 246, 0)" />
        </radialGradient>
        <radialGradient id="halo-inactive" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(120, 120, 150, 0.2)" />
          <stop offset="100%" stopColor="rgba(120, 120, 150, 0)" />
        </radialGradient>
      </defs>
      <circle
        cx="50" cy="50" r="48"
        fill={`url(#${haloId})`}
        className={unlocked ? 'loyalty-star-halo' : ''}
      />
      <polygon
        points="50,8 62,40 96,40 68,60 79,93 50,74 21,93 32,60 4,40 38,40"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---------- admin edit modal ---------- */

function emptyMilestone(): Milestone {
  return {
    id: '',
    type: 'sub',
    threshold: 1,
    icon: '⭐',
    label: '',
    title: '',
    description: '',
    reward: '',
  };
}

function EditMilestoneModal({
  initial,
  isNew,
  onSave,
  onDelete,
  onClose,
}: {
  initial: Milestone | null;
  isNew: boolean;
  onSave: (m: Milestone) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Milestone>(initial || emptyMilestone());
  const [error, setError] = useState<string | null>(null);
  const typeMeta = MILESTONE_TYPES.find(t => t.id === form.type);

  function update<K extends keyof Milestone>(key: K, val: Milestone[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function handleSave() {
    if (!form.label.trim()) return setError('Label is required');
    if (!form.title.trim()) return setError('Title is required');
    if (form.threshold < 1) return setError('Threshold must be at least 1');
    setError(null);
    onSave({
      ...form,
      id: form.id || `ms-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    });
  }

  return (
    <div className="loyalty-modal-overlay" onClick={onClose}>
      <div className="loyalty-modal loyalty-modal--edit" onClick={e => e.stopPropagation()}>
        <button className="loyalty-modal__close" onClick={onClose} aria-label="Close">×</button>
        <div className="loyalty-modal__body" style={{ textAlign: 'left' }}>
          <div className="loyalty-modal__eyebrow">{isNew ? 'New milestone' : 'Edit milestone'}</div>
          <h2 className="loyalty-modal__title">{isNew ? 'Add a star' : form.title || 'Edit star'}</h2>

          <div className="loyalty-form">
            <label className="loyalty-field">
              <span>Type</span>
              <select value={form.type} onChange={e => update('type', e.target.value as MilestoneType)}>
                {MILESTONE_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </label>

            <label className="loyalty-field">
              <span>Threshold {typeMeta?.unit ? `(${typeMeta.unit})` : ''}</span>
              <input
                type="number"
                min={1}
                value={form.threshold}
                onChange={e => update('threshold', Math.max(1, Number(e.target.value) || 1))}
              />
            </label>

            <label className="loyalty-field">
              <span>Icon</span>
              <input
                type="text"
                maxLength={4}
                value={form.icon}
                onChange={e => update('icon', e.target.value)}
                placeholder="⭐"
                className="loyalty-field__icon"
              />
            </label>

            <label className="loyalty-field loyalty-field--full">
              <span>Label (shown under the star)</span>
              <input
                type="text"
                maxLength={60}
                value={form.label}
                onChange={e => update('label', e.target.value)}
                placeholder="1 month"
              />
            </label>

            <label className="loyalty-field loyalty-field--full">
              <span>Title</span>
              <input
                type="text"
                maxLength={100}
                value={form.title}
                onChange={e => update('title', e.target.value)}
                placeholder="First Light"
              />
            </label>

            <label className="loyalty-field loyalty-field--full">
              <span>Description</span>
              <textarea
                rows={2}
                maxLength={500}
                value={form.description}
                onChange={e => update('description', e.target.value)}
                placeholder="Your first month of continuous support."
              />
            </label>

            <label className="loyalty-field loyalty-field--full">
              <span>Reward</span>
              <textarea
                rows={2}
                maxLength={300}
                value={form.reward}
                onChange={e => update('reward', e.target.value)}
                placeholder="Darsubscribbler role + profile badge"
              />
            </label>
          </div>

          {error && <p className="loyalty-form__error">{error}</p>}

          <div className="loyalty-form__actions">
            {!isNew && (
              <button
                type="button"
                className="loyalty-btn loyalty-btn--danger"
                onClick={() => {
                  if (window.confirm('Delete this milestone?')) onDelete(form.id);
                }}
              >
                Delete
              </button>
            )}
            <div className="loyalty-form__spacer" />
            <button type="button" className="loyalty-btn" onClick={onClose}>Cancel</button>
            <button type="button" className="loyalty-btn loyalty-btn--primary" onClick={handleSave}>
              {isNew ? 'Add star' : 'Save'}
            </button>
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
  profile,
  initialMilestones,
}: {
  signedIn: boolean;
  isAdmin: boolean;
  profile: ProfileData | null;
  initialMilestones: Milestone[];
}) {
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [panOffset, setPanOffset] = useState(4000);
  const [viewportWidth, setViewportWidth] = useState(1200);
  const [activeMilestone, setActiveMilestone] = useState<PositionedMilestone | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [editing, setEditing] = useState<{ milestone: Milestone | null; isNew: boolean } | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const panOffsetRef = useRef(panOffset);
  const dragRef = useRef({ dragging: false, startX: 0, startOffset: 0, moved: 0 });
  const frozenRef = useRef(false);

  const mainPathRef = useRef<SVGPathElement>(null);
  const decoPathRefs = useRef<(SVGPathElement | null)[]>([]);
  const nodeRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const positionedMilestones = useMemo<PositionedMilestone[]>(() => {
    const n = milestones.length;
    return milestones.map((m, i) => {
      const t = n > 1 ? i / (n - 1) : 0.5;
      return { ...m, x: START_X + t * (END_X - START_X) };
    });
  }, [milestones]);

  const positionedRef = useRef(positionedMilestones);
  useEffect(() => { positionedRef.current = positionedMilestones; }, [positionedMilestones]);
  useEffect(() => { panOffsetRef.current = panOffset; }, [panOffset]);

  useEffect(() => {
    const measure = () => {
      if (viewportRef.current) setViewportWidth(viewportRef.current.clientWidth);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const clampOffset = useCallback((offset: number): number => {
    const minOffset = PADDING;
    const maxOffset = Math.max(minOffset, WORLD_WIDTH - viewportWidth - PADDING);
    return Math.max(minOffset, Math.min(maxOffset, offset));
  }, [viewportWidth]);

  useEffect(() => {
    if (viewportWidth <= 0) return;
    setPanOffset(clampOffset(5000 - viewportWidth / 2));
  }, [viewportWidth, clampOffset]);

  /* ---------- animation loop ---------- */

  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let mainT = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const isFrozen = frozenRef.current || activeMilestone !== null || editing !== null;
      if (!isFrozen) mainT += dt;

      const decoT = (now - startTime) / 1000;

      // Deco paths — always animate
      decoPathRefs.current.forEach((el, i) => {
        if (el) el.setAttribute('d', buildPath(x => decoPathY(x, i, decoT)));
      });

      // Main path — freeze with mainT
      if (mainPathRef.current) {
        mainPathRef.current.setAttribute('d', buildPath(x => mainStringY(x, mainT)));
      }

      // Nodes — follow main string
      positionedRef.current.forEach(m => {
        const el = nodeRefs.current.get(m.id);
        if (el) el.style.top = `${mainStringY(m.x, mainT)}px`;
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- pan interaction ---------- */

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
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setPanOffset(o => clampOffset(o - 200));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setPanOffset(o => clampOffset(o + 200));
    }
  }, [clampOffset]);

  /* ---------- milestone helpers ---------- */

  const currentValue = useCallback((type: MilestoneType): number => {
    if (!profile) return 0;
    switch (type) {
      case 'sub': return profile.subMonths;
      case 'referral': return profile.referrals;
      case 'gift': return profile.gifts;
      case 'commissioner': return profile.isCommissioner ? 1 : 0;
    }
  }, [profile]);

  const isUnlocked = useCallback(
    (m: Milestone) => currentValue(m.type) >= m.threshold,
    [currentValue]
  );

  const handleNodeClick = useCallback((m: PositionedMilestone) => {
    if (dragRef.current.moved > 5) return;
    if (adminMode) {
      setEditing({ milestone: m, isNew: false });
    } else {
      setActiveMilestone(m);
    }
  }, [adminMode]);

  /* ---------- admin save/delete ---------- */

  const saveMilestones = useCallback(async (next: Milestone[]) => {
    const res = await fetch('/api/loyalty/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ milestones: next }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    setMilestones(data.milestones);
  }, []);

  const handleEditSave = useCallback(async (m: Milestone) => {
    const exists = milestones.some(x => x.id === m.id);
    const next = exists
      ? milestones.map(x => (x.id === m.id ? m : x))
      : [...milestones, m];
    try {
      await saveMilestones(next);
      setEditing(null);
    } catch (err: any) {
      alert('Failed to save: ' + err.message);
    }
  }, [milestones, saveMilestones]);

  const handleEditDelete = useCallback(async (id: string) => {
    const next = milestones.filter(x => x.id !== id);
    try {
      await saveMilestones(next);
      setEditing(null);
    } catch (err: any) {
      alert('Failed to delete: ' + err.message);
    }
  }, [milestones, saveMilestones]);

  /* ---------- ESC handler ---------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (editing) setEditing(null);
      else if (activeMilestone) setActiveMilestone(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeMilestone, editing]);

  /* ---------- render ---------- */

  return (
    <div className="loyalty-stage">
      {isAdmin && (
        <div className="loyalty-admin-bar">
          <button
            type="button"
            className={`loyalty-admin-toggle ${adminMode ? 'is-on' : ''}`}
            onClick={() => setAdminMode(v => !v)}
          >
            {adminMode ? '✕ Exit edit mode' : '⚙️ Edit milestones'}
          </button>
          {adminMode && (
            <button
              type="button"
              className="loyalty-admin-add"
              onClick={() => setEditing({ milestone: null, isNew: true })}
            >
              + Add star
            </button>
          )}
        </div>
      )}

      <div
        ref={viewportRef}
        className={`loyalty-viewport ${adminMode ? 'is-editing' : ''}`}
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label="Loyalty milestone journey"
      >
        <div className="loyalty-edge-fade loyalty-edge-fade--left" />
        <div className="loyalty-edge-fade loyalty-edge-fade--right" />

        <div className="loyalty-world" style={{ transform: `translateX(${-panOffset}px)` }}>
          <svg
            className="loyalty-svg"
            width={WORLD_WIDTH}
            height={SVG_HEIGHT}
            viewBox={`0 0 ${WORLD_WIDTH} ${SVG_HEIGHT}`}
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

          {positionedMilestones.map(m => {
            const unlocked = isUnlocked(m);
            return (
              <button
                key={m.id}
                type="button"
                className={`loyalty-node ${unlocked ? 'is-unlocked' : 'is-locked'} ${adminMode ? 'is-editable' : ''}`}
                style={{ left: m.x, top: mainStringY(m.x, 0) }}
                ref={el => {
                  if (el) nodeRefs.current.set(m.id, el);
                  else nodeRefs.current.delete(m.id);
                }}
                onPointerEnter={() => { frozenRef.current = true; }}
                onPointerLeave={() => { frozenRef.current = false; }}
                onClick={() => handleNodeClick(m)}
                aria-label={`${m.title}${unlocked ? ' (unlocked)' : ' (locked)'}: ${m.label}`}
              >
                <span className="loyalty-node__star-wrap">
                  <StarShape unlocked={unlocked} />
                  <span className="loyalty-node__icon">{m.icon}</span>
                </span>
                <span className="loyalty-node__label">{m.label}</span>
                {adminMode && <span className="loyalty-node__edit-badge">✎</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="loyalty-hint">
        {adminMode ? 'Click a star to edit • Use “+ Add star” to create one' : 'Drag, scroll, or use arrow keys to explore'}
      </div>

      {activeMilestone && !adminMode && (
        <div className="loyalty-modal-overlay" onClick={() => setActiveMilestone(null)}>
          <div className="loyalty-modal" onClick={e => e.stopPropagation()}>
            <button className="loyalty-modal__close" onClick={() => setActiveMilestone(null)} aria-label="Close">×</button>
            <div className="loyalty-modal__star-big">
              <StarShape unlocked={isUnlocked(activeMilestone)} />
              <span className="loyalty-modal__star-icon">{activeMilestone.icon}</span>
            </div>
            <div className="loyalty-modal__body">
              <div className="loyalty-modal__eyebrow">{activeMilestone.label}</div>
              <h2 className="loyalty-modal__title">{activeMilestone.title}</h2>
              <p className="loyalty-modal__description">{activeMilestone.description}</p>
              <div className="loyalty-modal__reward">
                <div className="loyalty-modal__reward-label">Reward</div>
                <div className="loyalty-modal__reward-text">{activeMilestone.reward}</div>
              </div>
              {signedIn ? (
                isUnlocked(activeMilestone) ? (
                  <div className="loyalty-modal__status loyalty-modal__status--unlocked">✓ Unlocked</div>
                ) : (
                  <div className="loyalty-modal__status loyalty-modal__status--progress">
                    <div className="loyalty-modal__progress-text">
                      {currentValue(activeMilestone.type)} / {activeMilestone.threshold}
                    </div>
                    <div className="loyalty-modal__progress-bar">
                      <div
                        className="loyalty-modal__progress-fill"
                        style={{
                          width: `${Math.min(100, (currentValue(activeMilestone.type) / activeMilestone.threshold) * 100)}%`,
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
        <EditMilestoneModal
          initial={editing.milestone}
          isNew={editing.isNew}
          onSave={handleEditSave}
          onDelete={handleEditDelete}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
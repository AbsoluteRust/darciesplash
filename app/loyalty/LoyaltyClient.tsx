// app/loyalty/LoyaltyClient.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type MilestoneType = 'sub' | 'referral' | 'gift' | 'commissioner';

type Milestone = {
  id: string;
  type: MilestoneType;
  threshold: number;
  icon: string;
  label: string;
  title: string;
  description: string;
  reward: string;
};

type ProfileData = {
  subMonths: number;
  referrals: number;
  gifts: number;
  isCommissioner: boolean;
};

const MILESTONES: Milestone[] = [
  { id: 'sub-1', type: 'sub', threshold: 1, icon: '🌙', label: '1 month', title: 'First Light',
    description: 'Your first month of continuous support.',
    reward: 'Darsubscribbler role + profile badge' },
  { id: 'ref-1', type: 'referral', threshold: 1, icon: '🌠', label: 'First referral', title: 'Star Finder',
    description: 'Brought your first friend to the server.',
    reward: 'Access to the referral leaderboard' },
  { id: 'gift-5', type: 'gift', threshold: 5, icon: '🎁', label: '5 gifts', title: 'Gift Giver',
    description: 'Sent 5 gifts to the community.',
    reward: 'Exclusive emote pack' },
  { id: 'sub-3', type: 'sub', threshold: 3, icon: '✨', label: '3 months', title: 'Constellation',
    description: 'Three months of loyalty.',
    reward: 'Bronze profile accent + exclusive badge colour' },
  { id: 'ref-5', type: 'referral', threshold: 5, icon: '💫', label: '5 referrals', title: 'Supernova',
    description: 'Five friends joined through you.',
    reward: '5,000 bonus points' },
  { id: 'sub-6', type: 'sub', threshold: 6, icon: '🌟', label: '6 months', title: 'Nebula',
    description: 'Half a year of support.',
    reward: 'Nebula profile theme' },
  { id: 'gift-10', type: 'gift', threshold: 10, icon: '🌌', label: '10 gifts', title: 'Star Bearer',
    description: 'Ten gifts shared with others.',
    reward: 'Custom emote slot for the server' },
  { id: 'sub-12', type: 'sub', threshold: 12, icon: '🪐', label: '1 year', title: 'Galaxy',
    description: 'A full year of continuous support.',
    reward: 'Loyalty Card I (bronze) + silver loyalty badge' },
  { id: 'commission', type: 'commissioner', threshold: 1, icon: '🎨', label: 'Commissioner', title: 'Patron of Art',
    description: 'Commissioned a piece from Darcie.',
    reward: 'Private commission channel + referral code' },
  { id: 'ref-15', type: 'referral', threshold: 15, icon: '🔭', label: '15 referrals', title: 'Cosmic Curator',
    description: 'Fifteen friends brought in.',
    reward: 'Animated profile decoration' },
  { id: 'sub-24', type: 'sub', threshold: 24, icon: '🌠', label: '2 years', title: 'Solar System',
    description: 'Two years of continuous support.',
    reward: 'Loyalty Card II (silver) + gold loyalty badge' },
  { id: 'sub-36', type: 'sub', threshold: 36, icon: '⭐', label: '3 years', title: 'Stellar Loyalty',
    description: 'Three years of continuous support.',
    reward: 'Loyalty Card III (gold) + platinum loyalty badge' },
  { id: 'sub-60', type: 'sub', threshold: 60, icon: '🌌', label: '5 years', title: 'Eternal',
    description: 'Five years of continuous support.',
    reward: 'Loyalty Card IV (platinum) + name in permanent credits' },
];

const WORLD_WIDTH = 10000;
const START_X = 2000;
const END_X = 8000;
const PADDING = 300;
const SVG_HEIGHT = 600;

function mainStringY(x: number): number {
  return SVG_HEIGHT / 2 + Math.sin(x / 420) * 50 + Math.cos(x / 680) * 25;
}

function decoPathY(x: number, idx: number): number {
  const amps = [120, 90, 60, 150, 100];
  const amp = amps[idx % amps.length];
  const phase = idx * 1.4;
  return SVG_HEIGHT / 2
    + Math.sin(x / 500 + phase) * amp
    + Math.cos(x / 320 + phase * 0.7) * (amp * 0.5);
}

function buildPath(fn: (x: number) => number): string {
  let d = '';
  for (let x = 0; x <= WORLD_WIDTH; x += 20) {
    d += (x === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + fn(x).toFixed(1) + ' ';
  }
  return d;
}

export default function LoyaltyClient({
  signedIn,
  profile,
}: {
  signedIn: boolean;
  profile: ProfileData | null;
}) {
  const [panOffset, setPanOffset] = useState(4000);
  const [viewportWidth, setViewportWidth] = useState(1200);
  const [activeMilestone, setActiveMilestone] = useState<(Milestone & { x: number }) | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const panOffsetRef = useRef(panOffset);
  const dragRef = useRef({ dragging: false, startX: 0, startOffset: 0, moved: 0 });

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

  const positionedMilestones = useMemo(() => {
    return MILESTONES.map((m, i) => {
      const t = MILESTONES.length > 1 ? i / (MILESTONES.length - 1) : 0.5;
      const x = START_X + t * (END_X - START_X);
      return { ...m, x };
    });
  }, []);

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

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startOffset: panOffsetRef.current,
      moved: 0,
    };
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

  const handleNodeClick = useCallback((m: Milestone & { x: number }) => {
    if (dragRef.current.moved > 5) return;
    setActiveMilestone(m);
  }, []);

  const closeModal = useCallback(() => setActiveMilestone(null), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeModal]);

  const mainPath = useMemo(() => buildPath(mainStringY), []);
  const decoPaths = useMemo(() => {
    const colors = ['#818cf8', '#a855f7', '#ec4899', '#22d3ee', '#3b82f6'];
    return Array.from({ length: 5 }, (_, i) => ({
      d: buildPath(x => decoPathY(x, i)),
      color: colors[i],
    }));
  }, []);

  return (
    <div className="loyalty-stage">
      <div
        ref={viewportRef}
        className="loyalty-viewport"
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label="Loyalty milestone journey"
      >
        <div className="loyalty-edge-fade loyalty-edge-fade--left" />
        <div className="loyalty-edge-fade loyalty-edge-fade--right" />

        <div
          className="loyalty-world"
          style={{ transform: `translateX(${-panOffset}px)` }}
        >
          <svg
            className="loyalty-svg"
            width={WORLD_WIDTH}
            height={SVG_HEIGHT}
            viewBox={`0 0 ${WORLD_WIDTH} ${SVG_HEIGHT}`}
            aria-hidden="true"
          >
            <defs>
              {decoPaths.map((p, i) => (
                <linearGradient
                  key={i}
                  id={`deco-grad-${i}`}
                  x1="0"
                  y1="0"
                  x2={WORLD_WIDTH}
                  y2="0"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="transparent" />
                  <stop offset="15%" stopColor={p.color} stopOpacity="0.15" />
                  <stop offset="50%" stopColor={p.color} stopOpacity="0.3" />
                  <stop offset="85%" stopColor={p.color} stopOpacity="0.15" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              ))}
              <linearGradient
                id="main-grad"
                x1="0"
                y1="0"
                x2={WORLD_WIDTH}
                y2="0"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="transparent" />
                <stop offset="12%" stopColor="#8b5cf6" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#a78bfa" stopOpacity="1" />
                <stop offset="88%" stopColor="#8b5cf6" stopOpacity="0.4" />
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

            {decoPaths.map((p, i) => (
              <path
                key={i}
                d={p.d}
                fill="none"
                stroke={`url(#deco-grad-${i})`}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            ))}

            <path
              d={mainPath}
              fill="none"
              stroke="url(#main-grad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#loyalty-glow)"
            />

            {Array.from({ length: 90 }, (_, i) => {
              const x = i * 100 + 50;
              if (x < PADDING + 100 || x > WORLD_WIDTH - PADDING - 100) return null;
              const y = mainStringY(x);
              return (
                <circle key={i} cx={x} cy={y} r={1.5} fill="rgba(167, 139, 250, 0.6)" />
              );
            })}
          </svg>

          {positionedMilestones.map(m => {
            const unlocked = isUnlocked(m);
            const y = mainStringY(m.x);
            return (
              <button
                key={m.id}
                type="button"
                className={`loyalty-node ${unlocked ? 'is-unlocked' : 'is-locked'} ${activeMilestone?.id === m.id ? 'is-active' : ''}`}
                style={{ left: m.x, top: y, transform: 'translate(-50%, -50%)' }}
                onClick={() => handleNodeClick(m)}
                aria-label={`${m.title}${unlocked ? ' (unlocked)' : ' (locked)'}: ${m.label}`}
              >
                <span className="loyalty-node__inner">
                  <span className="loyalty-node__icon">{m.icon}</span>
                </span>
                <span className="loyalty-node__label">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="loyalty-hint">Drag, scroll, or use arrow keys to explore</div>

      {activeMilestone && (
        <div className="loyalty-modal-overlay" onClick={closeModal}>
          <div className="loyalty-modal" onClick={e => e.stopPropagation()}>
            <button
              className="loyalty-modal__close"
              onClick={closeModal}
              aria-label="Close"
            >
              ×
            </button>
            <div
              className={`loyalty-modal__icon ${isUnlocked(activeMilestone) ? 'is-unlocked' : 'is-locked'}`}
            >
              {activeMilestone.icon}
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
                  <div className="loyalty-modal__status loyalty-modal__status--unlocked">
                    ✓ Unlocked
                  </div>
                ) : (
                  <div className="loyalty-modal__status loyalty-modal__status--progress">
                    <div className="loyalty-modal__progress-text">
                      {currentValue(activeMilestone.type)} / {activeMilestone.threshold}
                    </div>
                    <div className="loyalty-modal__progress-bar">
                      <div
                        className="loyalty-modal__progress-fill"
                        style={{
                          width: `${Math.min(
                            100,
                            (currentValue(activeMilestone.type) / activeMilestone.threshold) * 100
                          )}%`,
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
    </div>
  );
}
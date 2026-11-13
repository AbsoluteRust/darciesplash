// app/loyalty/LoyaltyClient.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildAllTiers,
  buildEmoteMarkup,
  CARD_COLLECTIONS,
  CARD_RARITIES,
  PACK_RARITIES,
  DEFAULT_THEME,
  THEME_GROUPS,
  themeCssVars,
  hexToRgba,
  parseTierIcon,
  TOTAL_TIERS,
  TOTAL_TRACK_COST,
  tierForStardust,
  type CardRarity,
  type CollectionFilter,
  type CustomPack,
  type LoyaltyTheme,
  type LoyaltyClaim,
  type LoyaltyClaims,
  type MergedTier,
  type PackRarity,
  type PendingLoyaltyPack,
  type RarityFilter,
  type RewardKind,
  type TierOverrides,
} from '@/lib/loyalty-milestones';
import { usePreviewMode } from '@/components/PreviewModeContext';

const WORLD_WIDTH = 16000;
const START_X = 2400;
const END_X = 13600;
const PADDING = 300;
const DECO_POINTS = 100;
const MAIN_POINTS = 120;

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

/* ---------- canvas helpers ---------- */

function drawDecoWave(
  ctx: CanvasRenderingContext2D, color: string,
  waveFn: (x: number) => number, startX: number, endX: number, points: number,
) {
  const grad = ctx.createLinearGradient(0, 0, WORLD_WIDTH, 0);
  grad.addColorStop(0,    hexToRgba(color, 0));
  grad.addColorStop(0.15, hexToRgba(color, 0.14));
  grad.addColorStop(0.5,  hexToRgba(color, 0.28));
  grad.addColorStop(0.85, hexToRgba(color, 0.14));
  grad.addColorStop(1,    hexToRgba(color, 0));
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i <= points; i++) {
    const x = startX + (i / points) * (endX - startX);
    const y = waveFn(x);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawMainWave(
  ctx: CanvasRenderingContext2D, accent: string, core: string,
  waveFn: (x: number) => number, startX: number, endX: number, points: number,
) {
  const grad = ctx.createLinearGradient(0, 0, WORLD_WIDTH, 0);
  grad.addColorStop(0,    hexToRgba(accent, 0));
  grad.addColorStop(0.10, hexToRgba(accent, 0.35));
  grad.addColorStop(0.50, hexToRgba(core,   0.9));
  grad.addColorStop(0.90, hexToRgba(accent, 0.35));
  grad.addColorStop(1,    hexToRgba(accent, 0));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i <= points; i++) {
    const x = startX + (i / points) * (endX - startX);
    const y = waveFn(x);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = grad;
  ctx.lineWidth = 8; ctx.globalAlpha = 0.22; ctx.stroke();
  ctx.lineWidth = 4; ctx.globalAlpha = 0.4; ctx.stroke();
  ctx.lineWidth = 2.5; ctx.globalAlpha = 1; ctx.stroke();
}

/* ---------- star tier helpers ---------- */

function isMajorTier(tier: number): boolean {
  if (tier === 100) return true;
  if (tier > 0 && tier % 8 === 0) return true;
  return false;
}

function starSize(tier: number): number {
  if (tier === 100) return 96;
  if (isMajorTier(tier)) return 78;
  if (tier % 10 === 0) return 68;
  if (tier % 5 === 0) return 58;
  return 46;
}

function starPalette(tier: number, unlocked: boolean, theme: LoyaltyTheme) {
  if (!unlocked) return {
    stroke: hexToRgba(theme.starLocked, 0.45),
    fill: hexToRgba(theme.starLocked, 0.15),
    halo: 'transparent',
  };
  if (tier === 100) return {
    stroke: hexToRgba(theme.starFinal, 0.98),
    fill: hexToRgba(theme.starFinal, 0.4),
    halo: hexToRgba(theme.starFinal, 0.28),
  };
  if (isMajorTier(tier)) return {
    stroke: hexToRgba(theme.starMajor, 0.98),
    fill: hexToRgba(theme.starMajor, 0.28),
    halo: hexToRgba(theme.starMajor, 0.24),
  };
  if (tier % 10 === 0) return {
    stroke: hexToRgba(theme.starTen, 0.85),
    fill: hexToRgba(theme.starTen, 0.2),
    halo: hexToRgba(theme.starTen, 0.18),
  };
  if (tier % 5 === 0) return {
    stroke: hexToRgba(theme.starFive, 0.7),
    fill: hexToRgba(theme.starFive, 0.14),
    halo: hexToRgba(theme.starFive, 0.14),
  };
  return {
    stroke: hexToRgba(theme.starRegular, 0.55),
    fill: hexToRgba(theme.starRegular, 0.1),
    halo: hexToRgba(theme.starRegular, 0.1),
  };
}

function StarSVG({ tier, size, unlocked, theme }: {
  tier: number; size: number; unlocked: boolean; theme: LoyaltyTheme;
}) {
  const pal = starPalette(tier, unlocked, theme);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="loyalty-star-svg" aria-hidden="true">
      {unlocked && <circle cx="50" cy="50" r="48" fill={pal.halo} />}
      <polygon
        points="50,8 62,40 96,40 68,60 79,93 50,74 21,93 32,60 4,40 38,40"
        fill={pal.fill} stroke={pal.stroke} strokeWidth="1.5" strokeLinejoin="round"
      />
    </svg>
  );
}

function TierIcon({ icon, starSize }: { icon: string; starSize: number }) {
  const parsed = useMemo(() => parseTierIcon(icon), [icon]);
  if (parsed.type === 'emote') {
    const ext = parsed.animated ? 'gif' : 'webp';
    const url = `https://cdn.discordapp.com/emojis/${parsed.id}.${ext}?size=96`;
    const size = Math.round(starSize * 0.55);
    return <img src={url} alt={parsed.name} className="loyalty-tier-icon-emote" style={{ width: size, height: size }} draggable={false} loading="lazy" decoding="async" />;
  }
  if (parsed.type === 'emoji') {
    const size = Math.round(starSize * 0.32);
    return <span className="loyalty-tier-icon-emoji" style={{ fontSize: `${size}px` }}>{parsed.value}</span>;
  }
  return null;
}

/* ---------- scrubber dot sizing ---------- */

function scrubberDotSize(tier: number): number {
  if (tier === 100) return 10;
  if (isMajorTier(tier)) return 7;
  if (tier % 10 === 0) return 5;
  if (tier % 5 === 0) return 4;
  return 3;
}

/* ---------- tier scrubber ---------- */

function TierScrubber({
  positioned,
  currentCenterTier,
  compact,
  onScrub,
}: {
  positioned: { tier: number }[];
  currentCenterTier: number;
  compact: boolean;
  onScrub: (tier: number) => void;
}) {
  const scrubberRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const computeTierFromX = useCallback((clientX: number): number => {
    const el = scrubberRef.current;
    if (!el) return 1;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return 1;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(ratio * (TOTAL_TIERS - 1)) + 1;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    setDragging(true);
    onScrub(computeTierFromX(e.clientX));
  }, [computeTierFromX, onScrub]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    e.preventDefault();
    onScrub(computeTierFromX(e.clientX));
  }, [dragging, computeTierFromX, onScrub]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    setDragging(false);
  }, [dragging]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      onScrub(Math.max(1, currentCenterTier - 1));
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      onScrub(Math.min(TOTAL_TIERS, currentCenterTier + 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      e.stopPropagation();
      onScrub(1);
    } else if (e.key === 'End') {
      e.preventDefault();
      e.stopPropagation();
      onScrub(TOTAL_TIERS);
    }
  }, [currentCenterTier, onScrub]);

  // Clamp label percent to [8, 92] so it never clips at the edges on narrow screens.
  const rawPct = ((currentCenterTier - 1) / (TOTAL_TIERS - 1)) * 100;
  const labelPct = Math.max(8, Math.min(92, rawPct));

  const visible = compact
    ? positioned.filter(m => m.tier % 5 === 0 || isMajorTier(m.tier))
    : positioned;

  return (
    <div
      ref={scrubberRef}
      className={`loyalty-scrubber${dragging ? ' is-dragging' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      role="slider"
      tabIndex={0}
      aria-label="Tier track scrubber"
      aria-valuemin={1}
      aria-valuemax={TOTAL_TIERS}
      aria-valuenow={currentCenterTier}
      aria-valuetext={`Tier ${currentCenterTier} of ${TOTAL_TIERS}`}
    >
      <div className="loyalty-scrubber__track">
        {visible.map(m => {
          const size = scrubberDotSize(m.tier);
          const isActive = m.tier <= currentCenterTier;
          const isMajor = isMajorTier(m.tier);
          const isCurrent = m.tier === currentCenterTier;
          return (
            <span
              key={m.tier}
              className={[
                'loyalty-scrubber__dot',
                isActive ? 'is-active' : '',
                isMajor ? 'is-major' : '',
                isCurrent ? 'is-current' : '',
              ].filter(Boolean).join(' ')}
              style={{ width: size, height: size }}
              aria-hidden="true"
            />
          );
        })}
      </div>
      {dragging && (
        <div className="loyalty-scrubber__label" style={{ left: `${labelPct}%` }}>
          Tier {currentCenterTier}
        </div>
      )}
    </div>
  );
}

/* ---------- emote picker ---------- */

type EmoteInfo = { id: string; name: string; animated: boolean; guildName: string; collections: string[]; ignored: boolean };
type CollectionInfo = { id: string; label: string };
type EmoteData = { emotes: EmoteInfo[]; collections: CollectionInfo[] };

function EmotePicker({
  emotes, collections, selectedId, loading, onSelect, onClear,
}: {
  emotes: EmoteInfo[]; collections: CollectionInfo[]; selectedId: string | null;
  loading: boolean; onSelect: (e: EmoteInfo) => void; onClear: () => void;
}) {
  const [search, setSearch] = useState('');
  const [showIgnored, setShowIgnored] = useState(false);
  const [collectionFilter, setCollectionFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return emotes.filter(e => {
      if (!showIgnored && e.ignored) return false;
      if (collectionFilter !== 'all') {
        if (collectionFilter === 'unassigned') {
          if (e.collections.length > 0) return false;
        } else if (!e.collections.includes(collectionFilter)) return false;
      }
      if (q && !e.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [emotes, search, showIgnored, collectionFilter]);

  return (
    <div className="loyalty-emote-picker">
      <div className="loyalty-emote-picker__toolbar">
        <input type="text" placeholder="Search emotes…" value={search} onChange={e => setSearch(e.target.value)} className="loyalty-emote-picker__search" />
        <select value={collectionFilter} onChange={e => setCollectionFilter(e.target.value)} className="loyalty-emote-picker__filter">
          <option value="all">All collections</option>
          <option value="unassigned">Unassigned</option>
          {collections.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <label className="loyalty-emote-picker__toggle">
          <input type="checkbox" checked={showIgnored} onChange={e => setShowIgnored(e.target.checked)} />
          Ignored
        </label>
        {selectedId && (
          <button type="button" className="loyalty-emote-picker__clear" onClick={onClear}>Clear</button>
        )}
      </div>
      {loading ? (
        <div className="loyalty-emote-picker__empty">Loading emotes…</div>
      ) : filtered.length === 0 ? (
        <div className="loyalty-emote-picker__empty">No emotes match</div>
      ) : (
        <div className="loyalty-emote-picker__grid">
          {filtered.map(e => {
            const ext = e.animated ? 'gif' : 'webp';
            const url = `https://cdn.discordapp.com/emojis/${e.id}.${ext}?size=48`;
            const isSelected = selectedId === e.id;
            return (
              <button
                key={e.id}
                type="button"
                className={`loyalty-emote-picker__item${isSelected ? ' is-selected' : ''}${e.ignored ? ' is-ignored' : ''}`}
                onClick={() => onSelect(e)}
                title={`:${e.name}:${e.guildName ? ` · ${e.guildName}` : ''}${e.collections.length ? ` · ${e.collections.join(', ')}` : ''}`}
              >
                <img src={url} alt={e.name} draggable={false} loading="lazy" decoding="async" />
              </button>
            );
          })}
        </div>
      )}
      <div className="loyalty-emote-picker__status">
        {filtered.length} emote{filtered.length === 1 ? '' : 's'}
        {selectedId && ' · 1 selected'}
      </div>
    </div>
  );
}

/* ---------- pack editor modal ---------- */

function PackEditorModal({
  pack, onSave, onDelete, onClose, saving,
}: {
  pack: CustomPack | null;
  onSave: (draft: Omit<CustomPack, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>) => Promise<void>;
  onDelete: (() => Promise<void>) | null;
  onClose: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(pack?.name ?? '');
  const [cardCount, setCardCount] = useState(pack?.cardCount ?? 5);
  const initialRarityMode = pack?.rarityFilter.mode ?? 'all';
  const [rarityMode, setRarityMode] = useState<RarityFilter['mode']>(initialRarityMode);
  const [raritySingle, setRaritySingle] = useState<PackRarity>(
    pack?.rarityFilter.mode === 'single' ? pack.rarityFilter.rarity : 'Rare'
  );
  const [rarityMin, setRarityMin] = useState<PackRarity>(
    pack?.rarityFilter.mode === 'range' ? pack.rarityFilter.min : 'Uncommon'
  );
  const [rarityMax, setRarityMax] = useState<PackRarity>(
    pack?.rarityFilter.mode === 'range' ? pack.rarityFilter.max : 'Epic'
  );
  const [rarityList, setRarityList] = useState<Set<PackRarity>>(() => {
    if (pack?.rarityFilter.mode === 'list') return new Set(pack.rarityFilter.rarities);
    return new Set(['Rare', 'Epic']);
  });
  const initialCollMode = pack?.collectionFilter.mode ?? 'any';
  const [collectionMode, setCollectionMode] = useState<CollectionFilter['mode']>(initialCollMode);
  const [collectionIds, setCollectionIds] = useState<Set<string>>(() => {
    if (pack?.collectionFilter.mode === 'specific') return new Set(pack.collectionFilter.collections);
    if (pack?.collectionFilter.mode === 'distinct') return new Set(pack.collectionFilter.collections);
    return new Set(['darcie', 'tobi']);
  });
  const [error, setError] = useState<string | null>(null);

  function toggleRarity(r: PackRarity) {
    const next = new Set(rarityList);
    if (next.has(r)) next.delete(r); else next.add(r);
    setRarityList(next);
  }
  function toggleCollection(id: string) {
    const next = new Set(collectionIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setCollectionIds(next);
  }

  async function handleSave() {
    if (!name.trim()) return setError('Name is required');
    if (!Number.isFinite(cardCount) || cardCount < 1 || cardCount > 20) return setError('Card count must be 1–20');

    let rarityFilter: RarityFilter;
    if (rarityMode === 'all') rarityFilter = { mode: 'all' };
    else if (rarityMode === 'single') rarityFilter = { mode: 'single', rarity: raritySingle };
    else if (rarityMode === 'range') {
      const minIdx = PACK_RARITIES.indexOf(rarityMin);
      const maxIdx = PACK_RARITIES.indexOf(rarityMax);
      if (minIdx > maxIdx) return setError('Range min cannot exceed max');
      rarityFilter = { mode: 'range', min: rarityMin, max: rarityMax };
    } else {
      if (rarityList.size === 0) return setError('Select at least one rarity');
      rarityFilter = { mode: 'list', rarities: [...rarityList] };
    }

    let collectionFilter: CollectionFilter;
    if (collectionMode === 'any') collectionFilter = { mode: 'any' };
    else {
      if (collectionIds.size === 0) return setError('Select at least one collection');
      collectionFilter = { mode: collectionMode, collections: [...collectionIds] };
    }

    setError(null);
    await onSave({ name: name.trim(), cardCount: Math.floor(cardCount), rarityFilter, collectionFilter });
  }

  return (
    <div className="loyalty-modal-overlay" onClick={onClose}>
      <div className="loyalty-modal loyalty-modal--edit" onClick={e => e.stopPropagation()}>
        <button className="loyalty-modal__close" onClick={onClose} aria-label="Close">×</button>
        <div className="loyalty-modal__body" style={{ textAlign: 'left' }}>
          <div className="loyalty-modal__eyebrow">{pack ? `Custom pack · ${pack.id}` : 'New custom pack'}</div>
          <h2 className="loyalty-modal__title">{pack ? 'Edit Pack' : 'Create Pack'}</h2>

          <div className="loyalty-form">
            <label className="loyalty-field loyalty-field--full">
              <span>Name</span>
              <input type="text" maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Starter Pack" />
            </label>
            <label className="loyalty-field loyalty-field--full">
              <span>Card count (1–20)</span>
              <input type="number" min={1} max={20} value={cardCount} onChange={e => setCardCount(Number(e.target.value) || 1)} />
            </label>

            <div className="loyalty-form-group">
              <div className="loyalty-form-group__title">Rarity filter</div>
              <p className="loyalty-form-group__hint">
                Excluded rarities roll their chance into the lowest selected rarity.
              </p>
              <label className="loyalty-field loyalty-field--full">
                <span>Mode</span>
                <select value={rarityMode} onChange={e => setRarityMode(e.target.value as any)}>
                  <option value="all">Any rarity (all tiers)</option>
                  <option value="single">Single rarity</option>
                  <option value="range">Range</option>
                  <option value="list">Specific list</option>
                </select>
              </label>
              {rarityMode === 'single' && (
                <label className="loyalty-field loyalty-field--full">
                  <span>Rarity</span>
                  <select value={raritySingle} onChange={e => setRaritySingle(e.target.value as PackRarity)}>
                    {PACK_RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
              )}
              {rarityMode === 'range' && (
                <div className="loyalty-pack-editor__inline">
                  <label className="loyalty-field">
                    <span>Min</span>
                    <select value={rarityMin} onChange={e => setRarityMin(e.target.value as PackRarity)}>
                      {PACK_RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </label>
                  <label className="loyalty-field">
                    <span>Max</span>
                    <select value={rarityMax} onChange={e => setRarityMax(e.target.value as PackRarity)}>
                      {PACK_RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </label>
                </div>
              )}
              {rarityMode === 'list' && (
                <div className="loyalty-pack-editor__inline">
                  {PACK_RARITIES.map(r => (
                    <label key={r} className="loyalty-emote-picker__toggle">
                      <input type="checkbox" checked={rarityList.has(r)} onChange={() => toggleRarity(r)} />
                      {r}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="loyalty-form-group">
              <div className="loyalty-form-group__title">Collection filter</div>
              <label className="loyalty-field loyalty-field--full">
                <span>Mode</span>
                <select value={collectionMode} onChange={e => setCollectionMode(e.target.value as any)}>
                  <option value="any">Any collection</option>
                  <option value="specific">Specific collection(s) — random each slot</option>
                  <option value="distinct">Distinct — one card from each collection</option>
                </select>
              </label>
              {(collectionMode === 'specific' || collectionMode === 'distinct') && (
                <div className="loyalty-pack-editor__inline">
                  {CARD_COLLECTIONS.map(c => (
                    <label key={c.id} className="loyalty-emote-picker__toggle">
                      <input type="checkbox" checked={collectionIds.has(c.id)} onChange={() => toggleCollection(c.id)} />
                      {c.label}
                    </label>
                  ))}
                </div>
              )}
              {collectionMode === 'distinct' && (
                <p className="loyalty-form-group__hint">
                  Slot <em>i</em> uses collection <code>i mod n</code>. With 5 slots and 5 collections, each collection gets exactly one card.
                </p>
              )}
            </div>
          </div>

          {error && <p className="loyalty-form__error">{error}</p>}

          <div className="loyalty-form__actions">
            {onDelete && (
              <button
                type="button" className="loyalty-btn"
                onClick={() => { if (confirm('Delete this pack? Tiers using it will lose their reward config.')) onDelete(); }}
                disabled={saving} style={{ marginRight: 'auto' }}
              >Delete</button>
            )}
            <button type="button" className="loyalty-btn" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="button" className="loyalty-btn loyalty-btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- pack manager modal ---------- */

function PackManagerModal({
  packs, loading, onRefresh, onCreate, onEdit, onClose,
}: {
  packs: CustomPack[]; loading: boolean; onRefresh: () => void;
  onCreate: () => void; onEdit: (p: CustomPack) => void; onClose: () => void;
}) {
  return (
    <div className="loyalty-modal-overlay" onClick={onClose}>
      <div className="loyalty-modal loyalty-modal--edit" onClick={e => e.stopPropagation()}>
        <button className="loyalty-modal__close" onClick={onClose} aria-label="Close">×</button>
        <div className="loyalty-modal__body" style={{ textAlign: 'left' }}>
          <div className="loyalty-modal__eyebrow">Admin · Custom packs</div>
          <h2 className="loyalty-modal__title">Manage Packs</h2>
          <p className="loyalty-modal__description" style={{ marginBottom: '1rem' }}>
            Presets available as rewards when editing tiers. Shared across all admins.
          </p>

          {loading ? (
            <div className="loyalty-emote-picker__empty">Loading packs…</div>
          ) : packs.length === 0 ? (
            <div className="loyalty-emote-picker__empty">No packs yet. Create one to assign it to a tier.</div>
          ) : (
            <div className="loyalty-packs-list">
              {packs.map(p => (
                <div key={p.id} className="loyalty-pack-item" onClick={() => onEdit(p)}>
                  <div className="loyalty-pack-item__info">
                    <div className="loyalty-pack-item__name">{p.name}</div>
                    <div className="loyalty-pack-item__meta">
                      {p.cardCount} card{p.cardCount === 1 ? '' : 's'} ·{' '}
                      {p.rarityFilter.mode === 'all' && 'any rarity'}
                      {p.rarityFilter.mode === 'single' && p.rarityFilter.rarity}
                      {p.rarityFilter.mode === 'range' && `${p.rarityFilter.min}–${p.rarityFilter.max}`}
                      {p.rarityFilter.mode === 'list' && p.rarityFilter.rarities.join(', ')}
                      {' · '}
                      {p.collectionFilter.mode === 'any' && 'any collection'}
                      {p.collectionFilter.mode === 'specific' && `from ${p.collectionFilter.collections.join(', ')}`}
                      {p.collectionFilter.mode === 'distinct' && `1 from each of ${p.collectionFilter.collections.join(', ')}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="loyalty-form__actions">
            <button type="button" className="loyalty-btn" onClick={onRefresh}>Refresh</button>
            <div style={{ flex: 1 }} />
            <button type="button" className="loyalty-btn" onClick={onClose}>Close</button>
            <button type="button" className="loyalty-btn loyalty-btn--primary" onClick={onCreate}>New pack</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- edit tier modal ---------- */

type KindType = 'none' | 'pack_points' | 'card' | 'pack' | 'minipack' | 'custom';

function EditTierModal({
  tier, emoteData, loadingEmotes, onRequestEmotes,
  customPacks, customPacksLoaded, onRequestCustomPacks, onOpenPackManager,
  onSave, onClose,
}: {
  tier: MergedTier;
  emoteData: EmoteData | null;
  loadingEmotes: boolean;
  onRequestEmotes: () => void;
  customPacks: CustomPack[];
  customPacksLoaded: boolean;
  onRequestCustomPacks: () => void;
  onOpenPackManager: () => void;
  onSave: (updated: MergedTier) => void;
  onClose: () => void;
}) {
  const initial = useMemo(() => parseTierIcon(tier.icon), [tier.icon]);
  const [iconMode, setIconMode] = useState<'emoji' | 'emote'>(initial.type === 'emote' ? 'emote' : 'emoji');
  const [emojiValue, setEmojiValue] = useState(initial.type === 'emoji' ? initial.value : '⭐');
  const [emoteValue, setEmoteValue] = useState(
    initial.type === 'emote' ? buildEmoteMarkup(initial.id, initial.name, initial.animated) : ''
  );
  const [form, setForm] = useState({ title: tier.title, description: tier.description, reward: tier.reward });

  const initialKind: KindType = useMemo(() => {
    const k = tier.rewardKind?.kind;
    return k === 'pack_points' || k === 'card' || k === 'pack' || k === 'minipack' || k === 'custom' ? k : 'none';
  }, [tier.rewardKind]);
  const [kindType, setKindType] = useState<KindType>(initialKind);
  const [pointsAmount, setPointsAmount] = useState(
    tier.rewardKind?.kind === 'pack_points' ? String(tier.rewardKind.amount) : ''
  );
  const [cardName, setCardName] = useState(tier.rewardKind?.kind === 'card' ? tier.rewardKind.cardName : '');
  const [cardRarity, setCardRarity] = useState<CardRarity | ''>(tier.rewardKind?.kind === 'card' ? tier.rewardKind.rarity : '');
  const [packId, setPackId] = useState<string>(tier.rewardKind?.kind === 'pack' ? tier.rewardKind.packId : '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (iconMode === 'emote') onRequestEmotes(); }, [iconMode, onRequestEmotes]);
  useEffect(() => { if (kindType === 'pack') onRequestCustomPacks(); }, [kindType, onRequestCustomPacks]);

  const selectedEmoteId = useMemo(() => {
    const p = parseTierIcon(emoteValue);
    return p.type === 'emote' ? p.id : null;
  }, [emoteValue]);
  const previewIcon = iconMode === 'emoji' ? emojiValue : emoteValue;

  function handleSave() {
    if (!form.title.trim()) return setError('Title is required');
    if (!form.reward.trim()) return setError('Reward display text is required');
    const icon = iconMode === 'emoji' ? emojiValue.trim() : emoteValue.trim();
    if (!icon) return setError('Icon is required');

    let rewardKind: RewardKind | undefined;
    if (kindType === 'pack_points') {
      const n = Math.floor(Number(pointsAmount));
      if (!Number.isFinite(n) || n <= 0) return setError('Pack points must be a positive whole number');
      rewardKind = { kind: 'pack_points', amount: n };
    } else if (kindType === 'card') {
      const name = cardName.trim();
      if (!name) return setError('Card name is required');
      if (!cardRarity) return setError('Card rarity is required');
      rewardKind = { kind: 'card', cardName: name, rarity: cardRarity };
    } else if (kindType === 'pack') {
      if (!packId) return setError('Select a pack');
      if (!customPacks.some(p => p.id === packId)) return setError('Selected pack no longer exists — pick another');
      rewardKind = { kind: 'pack', packId };
    } else if (kindType === 'minipack') {
      rewardKind = { kind: 'minipack' };
    } else if (kindType === 'custom') {
      rewardKind = { kind: 'custom' };
    }

    setError(null);
    onSave({ ...tier, ...form, icon, rewardKind });
  }

  return (
    <div className="loyalty-modal-overlay" onClick={onClose}>
      <div className="loyalty-modal loyalty-modal--edit" onClick={e => e.stopPropagation()}>
        <button className="loyalty-modal__close" onClick={onClose} aria-label="Close">×</button>
        <div className="loyalty-modal__body" style={{ textAlign: 'left' }}>
          <div className="loyalty-modal__eyebrow">Tier {tier.tier} · {tier.stardustRequired.toLocaleString()} stardust</div>
          <h2 className="loyalty-modal__title">Edit Tier {tier.tier}</h2>

          <div className="loyalty-form">
            <div className="loyalty-icon-section">
              <div className="loyalty-icon-section__header">
                <span>Icon</span>
                <div className="loyalty-icon-section__preview">
                  {previewIcon ? <TierIcon icon={previewIcon} starSize={56} /> : null}
                </div>
                <div className="loyalty-icon-section__tabs">
                  <button type="button" className={`loyalty-icon-tab${iconMode === 'emoji' ? ' is-active' : ''}`} onClick={() => setIconMode('emoji')}>Emoji</button>
                  <button type="button" className={`loyalty-icon-tab${iconMode === 'emote' ? ' is-active' : ''}`} onClick={() => setIconMode('emote')}>Emote</button>
                </div>
              </div>
              {iconMode === 'emoji' ? (
                <input type="text" maxLength={32} value={emojiValue} onChange={e => setEmojiValue(e.target.value)} className="loyalty-field__icon loyalty-icon-section__input" placeholder="⭐" />
              ) : (
                <EmotePicker
                  emotes={emoteData?.emotes || []}
                  collections={emoteData?.collections || []}
                  selectedId={selectedEmoteId}
                  loading={loadingEmotes}
                  onSelect={e => setEmoteValue(buildEmoteMarkup(e.id, e.name, e.animated))}
                  onClear={() => setEmoteValue('')}
                />
              )}
            </div>

            <label className="loyalty-field loyalty-field--full">
              <span>Title</span>
              <input type="text" maxLength={100} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </label>
            <label className="loyalty-field loyalty-field--full">
              <span>Description</span>
              <textarea rows={2} maxLength={500} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </label>
            <label className="loyalty-field loyalty-field--full">
              <span>Reward display text</span>
              <textarea rows={2} maxLength={300} value={form.reward} onChange={e => setForm(f => ({ ...f, reward: e.target.value }))} />
            </label>

            <div className="loyalty-form-group">
              <div className="loyalty-form-group__title">Auto-grantable reward</div>
              <p className="loyalty-form-group__hint">
                When a user claims this tier, the bot grants the reward and posts a receipt to <code>#botlogs</code>.
                Leave as <em>None</em> if the reward is purely display text.
              </p>

              <label className="loyalty-field loyalty-field--full">
                <span>Reward kind</span>
                <select value={kindType} onChange={e => setKindType(e.target.value as KindType)}>
                  <option value="none">None (display text only)</option>
                  <option value="pack_points">Pack points</option>
                  <option value="card">Specific card</option>
                  <option value="minipack">Minipack</option>
                  <option value="pack">Custom pack</option>
                  <option value="custom">Custom (manual fulfilment)</option>
                </select>
              </label>

              {kindType === 'pack_points' && (
                <label className="loyalty-field loyalty-field--full">
                  <span>Pack points amount</span>
                  <input type="number" min={1} max={1_000_000} value={pointsAmount} onChange={e => setPointsAmount(e.target.value)} />
                </label>
              )}

              {kindType === 'card' && (
                <>
                  <label className="loyalty-field loyalty-field--full">
                    <span>Card name (exact match against catalogue)</span>
                    <input type="text" value={cardName} onChange={e => setCardName(e.target.value)} placeholder="e.g. Sprout" />
                  </label>
                  <label className="loyalty-field loyalty-field--full">
                    <span>Card rarity</span>
                    <select value={cardRarity} onChange={e => setCardRarity(e.target.value as CardRarity | '')}>
                      <option value="">— Select rarity —</option>
                      {CARD_RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </label>
                </>
              )}

              {kindType === 'pack' && (
                <>
                  <label className="loyalty-field loyalty-field--full">
                    <span>Custom pack</span>
                    <select value={packId} onChange={e => setPackId(e.target.value)}>
                      <option value="">— Select a pack —</option>
                      {customPacks.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                  {customPacksLoaded && customPacks.length === 0 && (
                    <p className="loyalty-form-group__hint">No packs yet. Create one to use it here.</p>
                  )}
                  <button type="button" className="loyalty-btn" onClick={onOpenPackManager} style={{ alignSelf: 'flex-start' }}>
                    📦 Manage packs
                  </button>
                </>
              )}
            </div>
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

/* ---------- theme modal ---------- */

function EditThemeModal({
  theme, onPreview, onSave, onClose,
}: {
  theme: LoyaltyTheme;
  onPreview: (t: LoyaltyTheme) => void;
  onSave: (t: LoyaltyTheme) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<LoyaltyTheme>(theme);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof LoyaltyTheme>(key: K, val: string) {
    const next = { ...draft, [key]: val };
    setDraft(next);
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val)) onPreview(next);
  }
  function handleReset() { setDraft(DEFAULT_THEME); onPreview(DEFAULT_THEME); }
  function handleSave() {
    for (const [k, v] of Object.entries(draft)) {
      if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(v)) return setError(`Invalid hex for "${k}"`);
    }
    setError(null);
    onSave(draft);
  }

  return (
    <div className="loyalty-modal-overlay" onClick={onClose}>
      <div className="loyalty-modal loyalty-modal--theme" onClick={e => e.stopPropagation()}>
        <button className="loyalty-modal__close" onClick={onClose} aria-label="Close">×</button>
        <div className="loyalty-modal__body" style={{ textAlign: 'left' }}>
          <div className="loyalty-modal__eyebrow">Admin · Theme</div>
          <h2 className="loyalty-modal__title">Edit Page Colours</h2>
          <p className="loyalty-modal__description" style={{ marginBottom: '1rem' }}>
            Changes preview live. Save to publish for everyone.
          </p>

          <div className="loyalty-theme-groups">
            {THEME_GROUPS.map(group => (
              <div key={group.name} className="loyalty-theme-group">
                <div className="loyalty-theme-group__title">{group.name}</div>
                {group.keys.map(c => (
                  <label key={c.key} className="loyalty-theme-row">
                    <span className="loyalty-theme-row__label">{c.label}</span>
                    <span className="loyalty-theme-row__swatch" style={{ background: draft[c.key] }} />
                    <input type="color" value={draft[c.key]} onChange={e => update(c.key, e.target.value)} className="loyalty-theme-row__picker" />
                    <input type="text" value={draft[c.key]} onChange={e => update(c.key, e.target.value)} maxLength={7} className="loyalty-theme-row__hex" />
                  </label>
                ))}
              </div>
            ))}
          </div>

          {error && <p className="loyalty-form__error">{error}</p>}

          <div className="loyalty-form__actions">
            <button type="button" className="loyalty-btn" onClick={handleReset}>Reset to defaults</button>
            <div style={{ flex: 1 }} />
            <button type="button" className="loyalty-btn" onClick={onClose}>Cancel</button>
            <button type="button" className="loyalty-btn loyalty-btn--primary" onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- card reveal modal ---------- */

function CardRevealModal({
  packName, cards, onClose,
}: {
  packName: string;
  cards: { name: string; rarity: string; image?: string }[];
  onClose: () => void;
}) {
  return (
    <div className="loyalty-modal-overlay" onClick={onClose}>
      <div className="loyalty-modal loyalty-modal--theme" onClick={e => e.stopPropagation()}>
        <button className="loyalty-modal__close" onClick={onClose} aria-label="Close">×</button>
        <div className="loyalty-modal__body">
          <div className="loyalty-modal__eyebrow">Pack opened</div>
          <h2 className="loyalty-modal__title">{packName}</h2>
          <p className="loyalty-modal__description" style={{ marginBottom: '1rem' }}>
            Your cards have been added to your collection and posted to Discord.
          </p>

          <div className="loyalty-reveal-grid">
            {cards.map((c, i) => (
              <div key={`${c.name}-${i}`} className="loyalty-reveal-card">
                {c.image ? (
                  <img className="loyalty-reveal-card__img" src={c.image} alt={c.name} />
                ) : <div className="loyalty-reveal-card__img" />}
                <div className="loyalty-reveal-card__name">{c.name}</div>
                <div className="loyalty-reveal-card__rarity">{c.rarity}</div>
              </div>
            ))}
          </div>

          <div className="loyalty-form__actions">
            <button type="button" className="loyalty-btn loyalty-btn--primary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- main component ---------- */

export default function LoyaltyClient({
  signedIn, isAdmin, trackActive, currentStardust, currentTier,
  initialOverrides, initialTiers, initialTheme, initialClaims, initialPendingPacks,
}: {
  signedIn: boolean; isAdmin: boolean; trackActive: boolean;
  currentStardust: number; currentTier: number;
  initialOverrides: TierOverrides;
  initialTiers: MergedTier[];
  initialTheme: LoyaltyTheme;
  initialClaims: LoyaltyClaims;
  initialPendingPacks: PendingLoyaltyPack[];
}) {
  const { effectiveIsAdmin } = usePreviewMode();
  const showAdminUI = isAdmin && effectiveIsAdmin;

  const [overrides, setOverrides] = useState<TierOverrides>(initialOverrides);
  const tiers = useMemo(() => buildAllTiers(overrides), [overrides]);

  const [theme, setTheme] = useState<LoyaltyTheme>(initialTheme);
  const [themeSnapshot, setThemeSnapshot] = useState<LoyaltyTheme | null>(null);
  const [themeOpen, setThemeOpen] = useState(false);

  const [emoteData, setEmoteData] = useState<EmoteData | null>(null);
  const [loadingEmotes, setLoadingEmotes] = useState(false);
  const emotePromiseRef = useRef<Promise<EmoteData> | null>(null);

  const [customPacks, setCustomPacks] = useState<CustomPack[]>([]);
  const [customPacksLoaded, setCustomPacksLoaded] = useState(false);
  const customPacksPromiseRef = useRef<Promise<CustomPack[]> | null>(null);
  const [packsManagerOpen, setPacksManagerOpen] = useState(false);
  const [packEditorPack, setPackEditorPack] = useState<CustomPack | null | 'new'>(null);
  const [savingPack, setSavingPack] = useState(false);

  const [panOffset, setPanOffset] = useState(6000);
  const [viewportSize, setViewportSize] = useState({ width: 1200, height: 600 });
  const [activeTier, setActiveTier] = useState<MergedTier | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [editing, setEditing] = useState<MergedTier | null>(null);
  const [previewStardust, setPreviewStardust] = useState<number | null>(null);

  const [claims, setClaims] = useState<LoyaltyClaims>(initialClaims);
  const [claimingTier, setClaimingTier] = useState<number | null>(null);
  const [pendingPacks, setPendingPacks] = useState<PendingLoyaltyPack[]>(initialPendingPacks);
  const [openingPackId, setOpeningPackId] = useState<string | null>(null);
  const [revealedPack, setRevealedPack] = useState<{ packName: string; cards: any[] } | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const panOffsetRef = useRef(panOffset);
  const viewportSizeRef = useRef(viewportSize);
  const dragRef = useRef({ dragging: false, startX: 0, startOffset: 0, moved: 0 });
  const frozenRef = useRef(false);
  const themeRef = useRef(theme);
  const activeTierRef = useRef<MergedTier | null>(null);
  const editingRef = useRef<MergedTier | null>(null);

  const nodeRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const cssVars = useMemo(() => themeCssVars(theme) as React.CSSProperties, [theme]);

  useEffect(() => { panOffsetRef.current = panOffset; }, [panOffset]);
  useEffect(() => { viewportSizeRef.current = viewportSize; }, [viewportSize]);
  useEffect(() => { themeRef.current = theme; }, [theme]);
  useEffect(() => { activeTierRef.current = activeTier; }, [activeTier]);
  useEffect(() => { editingRef.current = editing; }, [editing]);

  /* ---------- close admin modals when preview turns admin UI off ---------- */

  const themeSnapshotRef = useRef(themeSnapshot);
  useEffect(() => { themeSnapshotRef.current = themeSnapshot; }, [themeSnapshot]);

  useEffect(() => {
    if (showAdminUI) return;
    setEditing(null);
    setThemeOpen(false);
    setPacksManagerOpen(false);
    setPackEditorPack(null);
    if (themeSnapshotRef.current) {
      setTheme(themeSnapshotRef.current);
      setThemeSnapshot(null);
    }
  }, [showAdminUI]);

  /* ---------- lock body scroll ---------- */

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyPaddingRight = document.body.style.paddingRight;
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

  /* ---------- viewport + canvas ---------- */

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setViewportSize({ width: rect.width, height: rect.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(viewportSize.width * dpr));
    const h = Math.max(1, Math.floor(viewportSize.height * dpr));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
  }, [viewportSize.width, viewportSize.height]);

  const positioned = useMemo(() => tiers.map((t, i) => {
    const ratio = TOTAL_TIERS > 1 ? i / (TOTAL_TIERS - 1) : 0.5;
    return { ...t, x: START_X + ratio * (END_X - START_X) };
  }), [tiers]);
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

  const effectiveStardust = previewStardust ?? (trackActive ? currentStardust : 0);
  const effectiveTier = tierForStardust(effectiveStardust);

  /* ---------- scrubber ---------- */

  // Reverse-map the current panOffset to the tier currently centered in the
  // viewport. This drives the scrubber's filled-dot state, so the scrubber
  // reflects wherever the user has scrolled or dragged to.
  const currentCenterTier = useMemo(() => {
    const centerX = panOffset + viewportSize.width / 2;
    const ratio = (centerX - START_X) / (END_X - START_X);
    const tier = Math.round(ratio * (TOTAL_TIERS - 1)) + 1;
    return Math.max(1, Math.min(TOTAL_TIERS, tier));
  }, [panOffset, viewportSize.width]);

  const compactScrubber = viewportSize.width < 600;

  const handleScrubToTier = useCallback((tier: number) => {
    const clamped = Math.max(1, Math.min(TOTAL_TIERS, tier));
    const ratio = (clamped - 1) / (TOTAL_TIERS - 1);
    const tierX = START_X + ratio * (END_X - START_X);
    setPanOffset(clampOffset(tierX - viewportSize.width / 2));
  }, [viewportSize.width, clampOffset]);

  /* ---------- data loading ---------- */

  const loadEmotes = useCallback((): Promise<EmoteData> => {
    if (emoteData) return Promise.resolve(emoteData);
    if (emotePromiseRef.current) return emotePromiseRef.current;
    setLoadingEmotes(true);
    const promise = fetch('/api/admin/emotes', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: any) => {
        const emotes: EmoteInfo[] = (data.emotes || []).map((e: any) => ({
          id: String(e.id), name: String(e.name), animated: !!e.animated,
          guildName: String(e.guildName || ''),
          collections: Array.isArray(e.assignment?.collections) ? e.assignment.collections.map(String) : [],
          ignored: !!e.assignment?.ignored,
        }));
        const collections: CollectionInfo[] = (data.collections || []).map((c: any) => ({
          id: String(c.id), label: String(c.label || c.id),
        }));
        const result = { emotes, collections };
        setEmoteData(result);
        return result;
      })
      .catch(() => {
        const result = { emotes: [] as EmoteInfo[], collections: [] as CollectionInfo[] };
        setEmoteData(result);
        return result;
      })
      .finally(() => { setLoadingEmotes(false); emotePromiseRef.current = null; });
    emotePromiseRef.current = promise;
    return promise;
  }, [emoteData]);

  const requestEmotes = useCallback(() => { loadEmotes().catch(() => {}); }, [loadEmotes]);

  const loadCustomPacks = useCallback((): Promise<CustomPack[]> => {
    if (customPacksPromiseRef.current) return customPacksPromiseRef.current;
    const promise = fetch('/api/loyalty/custom-packs', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: any) => {
        const packs: CustomPack[] = Array.isArray(data.packs) ? data.packs : [];
        setCustomPacks(packs);
        setCustomPacksLoaded(true);
        return packs;
      })
      .catch(() => { setCustomPacksLoaded(true); return [] as CustomPack[]; })
      .finally(() => { customPacksPromiseRef.current = null; });
    customPacksPromiseRef.current = promise;
    return promise;
  }, []);

  const requestCustomPacks = useCallback(() => { loadCustomPacks().catch(() => {}); }, [loadCustomPacks]);

  const fetchPendingPacks = useCallback(async (): Promise<PendingLoyaltyPack[]> => {
    try {
      const res = await fetch('/api/loyalty/pending-packs', { cache: 'no-store' });
      if (!res.ok) return pendingPacks;
      const data = await res.json().catch(() => ({}));
      const packs = Array.isArray(data?.packs) ? data.packs : [];
      setPendingPacks(packs);
      return packs;
    } catch {
      return pendingPacks;
    }
  }, [pendingPacks]);

  /* ---------- main render loop ---------- */

  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let mainT = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const isFrozen = frozenRef.current || activeTierRef.current !== null || editingRef.current !== null;
      if (!isFrozen) mainT += dt;

      const decoT = (now - startTime) / 1000;
      const size = viewportSizeRef.current;
      const pan = panOffsetRef.current;
      const th = themeRef.current;

      const canvas = canvasRef.current;
      if (canvas && size.width > 0 && size.height > 0) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.setTransform(dpr, 0, 0, dpr, -pan * dpr, 0);
          const buf = 80;
          const startX = Math.max(0, pan - buf);
          const endX = Math.min(WORLD_WIDTH, pan + size.width + buf);
          const decoColors = [th.deco1, th.deco2, th.deco3, th.deco4, th.deco5];
          for (let i = 0; i < 5; i++) {
            drawDecoWave(ctx, decoColors[i], (x) => decoPathY(x, i, decoT, size.height), startX, endX, DECO_POINTS);
          }
          drawMainWave(ctx, th.accent, th.stringMid, (x) => mainStringY(x, mainT, size.height), startX, endX, MAIN_POINTS);
        }
      }

      const list = positionedRef.current;
      for (let i = 0; i < list.length; i++) {
        const m = list[i];
        const el = nodeRefs.current.get(m.tier);
        if (!el) continue;
        const y = mainStringY(m.x, mainT, size.height);
        el.style.transform = `translate(-50%, calc(-50% + ${y}px))`;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  /* ---------- pan ---------- */

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragRef.current = { dragging: true, startX: e.clientX, startOffset: panOffsetRef.current, moved: 0 };
    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current.dragging) return;
      const dx = ev.clientX - dragRef.current.startX;
      dragRef.current.moved = Math.max(dragRef.current.moved, Math.abs(dx));
      if (dragRef.current.moved > 5) setPanOffset(clampOffset(dragRef.current.startOffset - dx));
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

  const handleNodeClick = useCallback((t: MergedTier) => {
    if (dragRef.current.moved > 5) return;
    if (adminMode && showAdminUI) {
      setEditing(t);
      loadEmotes().catch(() => {});
    } else {
      setActiveTier(t);
    }
  }, [adminMode, showAdminUI, loadEmotes]);

  /* ---------- admin saves ---------- */

  const saveOverrides = useCallback(async (next: TierOverrides) => {
    const res = await fetch('/api/loyalty/milestones', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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
        icon: updated.icon, title: updated.title, description: updated.description,
        reward: updated.reward, rewardKind: updated.rewardKind,
      },
    };
    try { await saveOverrides(next); setEditing(null); }
    catch (err: any) { alert('Failed to save: ' + err.message); }
  }, [overrides, saveOverrides]);

  const handleThemePreview = useCallback((next: LoyaltyTheme) => setTheme(next), []);
  const handleThemeOpen = useCallback(() => { setThemeSnapshot(theme); setThemeOpen(true); }, [theme]);
  const handleThemeCancel = useCallback(() => {
    if (themeSnapshot) setTheme(themeSnapshot);
    setThemeSnapshot(null); setThemeOpen(false);
  }, [themeSnapshot]);

  const handleThemeSave = useCallback(async (next: LoyaltyTheme) => {
    try {
      const res = await fetch('/api/loyalty/theme', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setTheme(data.theme); setThemeSnapshot(null); setThemeOpen(false);
    } catch (err: any) { alert('Failed to save theme: ' + err.message); }
  }, []);

  /* ---------- pack manager ---------- */

  const handleOpenPackManager = useCallback(() => {
    setPacksManagerOpen(true);
    loadCustomPacks().catch(() => {});
  }, [loadCustomPacks]);

  const handlePackSave = useCallback(async (draft: any) => {
    setSavingPack(true);
    try {
      const body = packEditorPack && packEditorPack !== 'new' ? { ...draft, id: packEditorPack.id } : draft;
      const res = await fetch('/api/loyalty/custom-packs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await loadCustomPacks();
      setPackEditorPack(null);
    } catch (err: any) { alert('Failed to save pack: ' + err.message); }
    finally { setSavingPack(false); }
  }, [packEditorPack, loadCustomPacks]);

  const handlePackDelete = useCallback(async () => {
    if (!packEditorPack || packEditorPack === 'new') return;
    setSavingPack(true);
    try {
      const res = await fetch(`/api/loyalty/custom-packs?id=${encodeURIComponent(packEditorPack.id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await loadCustomPacks();
      setPackEditorPack(null);
    } catch (err: any) { alert('Failed to delete pack: ' + err.message); }
    finally { setSavingPack(false); }
  }, [packEditorPack, loadCustomPacks]);

  /* ---------- claim + open ---------- */

  const handleClaim = useCallback(async (tier: MergedTier) => {
    if (claimingTier !== null) return;
    setClaimingTier(tier.tier);
    try {
      const res = await fetch('/api/loyalty/claim', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tier.tier }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (data.claim) {
        setClaims(prev => ({ ...prev, [String(tier.tier)]: data.claim as LoyaltyClaim }));
        await fetchPendingPacks();
      }
    } catch (err: any) {
      alert('Claim failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setClaimingTier(null);
    }
  }, [claimingTier, fetchPendingPacks]);

  const handleOpenPack = useCallback(async (pending: PendingLoyaltyPack) => {
    if (openingPackId) return;
    setOpeningPackId(pending.id);
    try {
      const res = await fetch('/api/loyalty/open-pack', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingId: pending.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setRevealedPack({ packName: data.packName || pending.packName, cards: data.cards || [] });
      setPendingPacks(prev => prev.filter(p => p.id !== pending.id));
    } catch (err: any) {
      alert('Failed to open pack: ' + (err?.message || 'Unknown error'));
    } finally {
      setOpeningPackId(null);
    }
  }, [openingPackId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (packEditorPack) { setPackEditorPack(null); return; }
      if (packsManagerOpen) { setPacksManagerOpen(false); return; }
      if (revealedPack) { setRevealedPack(null); return; }
      if (themeOpen) { handleThemeCancel(); return; }
      if (editing) setEditing(null);
      else if (activeTier) setActiveTier(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeTier, editing, themeOpen, handleThemeCancel, packsManagerOpen, packEditorPack, revealedPack]);

  const pendingForTier = useCallback((tierNum: number): PendingLoyaltyPack | null => {
    return pendingPacks.find(p => p.tier === tierNum) || null;
  }, [pendingPacks]);

  /* ---------- render ---------- */

  return (
    <div className="loyalty-page" style={cssVars}>
      <div className="loyalty-header">
        <h1 className="loyalty-title">Your Loyalty Journey</h1>
        <p className="loyalty-subtitle">
          Drag through the stars. Every tier is a step along the path — click any star to inspect its reward.
        </p>
      </div>

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
              <span className="loyalty-progress-bar__tier">Tier {effectiveTier} / {TOTAL_TIERS}</span>
            </div>
            <div className="loyalty-progress-bar__track">
              <div className="loyalty-progress-bar__fill" style={{ width: `${Math.min(100, (effectiveStardust / TOTAL_TRACK_COST) * 100)}%` }} />
            </div>
          </div>
        )}

        {showAdminUI && (
          <div className="loyalty-admin-bar">
            <button type="button" className="loyalty-admin-toggle" onClick={handleThemeOpen}>🎨 Edit theme</button>
            <button
              type="button"
              className={`loyalty-admin-toggle ${adminMode ? 'is-on' : ''}`}
              onClick={() => setAdminMode(v => !v)}
            >
              {adminMode ? '✕ Exit edit mode' : '⚙️ Edit tiers'}
            </button>
            <button type="button" className="loyalty-admin-toggle" onClick={handleOpenPackManager}>📦 Manage packs</button>
            <div className="loyalty-admin-preview">
              <label htmlFor="preview-stardust">Preview stardust</label>
              <input
                id="preview-stardust" type="number" min={0} max={TOTAL_TRACK_COST}
                placeholder={trackActive ? String(currentStardust) : '0'}
                value={previewStardust ?? ''}
                onChange={e => {
                  const v = e.target.value.trim();
                  setPreviewStardust(v === '' ? null : Math.max(0, Math.min(TOTAL_TRACK_COST, Number(v) || 0)));
                }}
              />
              <button type="button" className="loyalty-admin-reset" onClick={() => setPreviewStardust(null)} disabled={previewStardust === null}>Reset</button>
            </div>
          </div>
        )}

        <div
          ref={viewportRef}
          className={`loyalty-viewport ${adminMode && showAdminUI ? 'is-editing' : ''}`}
          onPointerDown={handlePointerDown}
          onKeyDown={handleKeyDown}
          tabIndex={0} role="region" aria-label="Loyalty tier track"
        >
          <canvas ref={canvasRef} className="loyalty-canvas" />
          <div className="loyalty-world" style={{ transform: `translateX(${-panOffset}px)` }}>
            {positioned.map(m => {
              const unlocked = m.tier <= effectiveTier;
              const size = starSize(m.tier);
              const showLabel = isMajorTier(m.tier);
              return (
                <button
                  key={m.tier}
                  type="button"
                  className={`loyalty-node ${unlocked ? 'is-unlocked' : 'is-locked'} ${adminMode && showAdminUI ? 'is-editable' : ''}`}
                  style={{ left: m.x, top: 0, transform: 'translate(-50%, -50%)' }}
                  ref={el => { if (el) nodeRefs.current.set(m.tier, el); else nodeRefs.current.delete(m.tier); }}
                  onPointerEnter={() => { frozenRef.current = true; }}
                  onPointerLeave={() => { frozenRef.current = false; }}
                  onClick={() => handleNodeClick(m)}
                  aria-label={`Tier ${m.tier}: ${m.title}${unlocked ? ' (unlocked)' : ''}`}
                >
                  <span className="loyalty-node__wrap" style={{ width: size, height: size }}>
                    <StarSVG tier={m.tier} size={size} unlocked={unlocked} theme={theme} />
                    <TierIcon icon={m.icon} starSize={size} />
                  </span>
                  {showLabel && <span className="loyalty-node__label">{m.tier}</span>}
                  {adminMode && showAdminUI && <span className="loyalty-node__edit-badge">✎</span>}
                </button>
              );
            })}
          </div>
          <div className="loyalty-edge-fade loyalty-edge-fade--left" />
          <div className="loyalty-edge-fade loyalty-edge-fade--right" />
        </div>

        <TierScrubber
          positioned={positioned}
          currentCenterTier={currentCenterTier}
          compact={compactScrubber}
          onScrub={handleScrubToTier}
        />

        <div className="loyalty-hint">
          {adminMode && showAdminUI ? 'Click any star to edit its reward or icon' : 'Drag, scroll, or use the scrubber below to browse'}
        </div>
      </div>

      {activeTier && !(adminMode && showAdminUI) && (() => {
        const pending = pendingForTier(activeTier.tier);
        return (
          <div className="loyalty-modal-overlay" onClick={() => setActiveTier(null)}>
            <div className="loyalty-modal" onClick={e => e.stopPropagation()}>
              <button className="loyalty-modal__close" onClick={() => setActiveTier(null)} aria-label="Close">×</button>
              <div className="loyalty-modal__star-big">
                <StarSVG tier={activeTier.tier} size={120} unlocked={activeTier.tier <= effectiveTier} theme={theme} />
                <TierIcon icon={activeTier.icon} starSize={120} />
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
                  <div className="loyalty-modal__status loyalty-modal__status--signin">Track opens January 1, 2027</div>
                ) : !signedIn ? (
                  <div className="loyalty-modal__status loyalty-modal__status--signin">Sign in to track your progress</div>
                ) : activeTier.tier > effectiveTier ? (
                  <div className="loyalty-modal__status loyalty-modal__status--progress">
                    <div className="loyalty-modal__progress-text">
                      {effectiveStardust.toLocaleString()} / {activeTier.stardustRequired.toLocaleString()} stardust
                    </div>
                    <div className="loyalty-modal__progress-bar">
                      <div className="loyalty-modal__progress-fill" style={{ width: `${Math.min(100, (effectiveStardust / activeTier.stardustRequired) * 100)}%` }} />
                    </div>
                  </div>
                ) : pending ? (
                  <button
                    type="button"
                    className="loyalty-btn loyalty-btn--primary loyalty-btn--full"
                    disabled={openingPackId === pending.id}
                    onClick={() => handleOpenPack(pending)}
                  >
                    {openingPackId === pending.id ? 'Opening…' : `Open ${pending.packName}`}
                  </button>
                ) : claims[String(activeTier.tier)] ? (
                  <div className="loyalty-modal__status loyalty-modal__status--unlocked">
                    ✓ Claimed
                    {!claims[String(activeTier.tier)].granted && (
                      <small>pending manual fulfilment by an admin</small>
                    )}
                  </div>
                ) : !activeTier.rewardKind ? (
                  <div className="loyalty-modal__status loyalty-modal__status--unlocked">✓ Unlocked</div>
                ) : (
                  <button
                    type="button"
                    className="loyalty-btn loyalty-btn--primary loyalty-btn--full"
                    disabled={claimingTier === activeTier.tier}
                    onClick={() => handleClaim(activeTier)}
                  >
                    {claimingTier === activeTier.tier ? 'Claiming…' : 'Claim reward'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {showAdminUI && editing && (
        <EditTierModal
          tier={editing}
          emoteData={emoteData}
          loadingEmotes={loadingEmotes}
          onRequestEmotes={requestEmotes}
          customPacks={customPacks}
          customPacksLoaded={customPacksLoaded}
          onRequestCustomPacks={requestCustomPacks}
          onOpenPackManager={handleOpenPackManager}
          onSave={handleEditSave}
          onClose={() => setEditing(null)}
        />
      )}

      {showAdminUI && themeOpen && (
        <EditThemeModal
          theme={theme}
          onPreview={handleThemePreview}
          onSave={handleThemeSave}
          onClose={handleThemeCancel}
        />
      )}

      {showAdminUI && packsManagerOpen && (
        <PackManagerModal
          packs={customPacks}
          loading={!customPacksLoaded}
          onRefresh={() => loadCustomPacks()}
          onCreate={() => setPackEditorPack('new')}
          onEdit={(p) => setPackEditorPack(p)}
          onClose={() => setPacksManagerOpen(false)}
        />
      )}

      {showAdminUI && packEditorPack !== null && (
        <PackEditorModal
          pack={packEditorPack === 'new' ? null : packEditorPack}
          saving={savingPack}
          onSave={handlePackSave}
          onDelete={packEditorPack === 'new' ? null : handlePackDelete}
          onClose={() => setPackEditorPack(null)}
        />
      )}

      {revealedPack && (
        <CardRevealModal
          packName={revealedPack.packName}
          cards={revealedPack.cards}
          onClose={() => setRevealedPack(null)}
        />
      )}
    </div>
  );
}
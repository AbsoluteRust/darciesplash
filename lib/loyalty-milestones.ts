// lib/loyalty-milestones.ts

export type TierBand = 'intro' | 'early' | 'mid' | 'late' | 'final';

export type TierContent = {
  icon: string;
  title: string;
  description: string;
  reward: string;
};

/* ---------- card rarities (from bot config.js ALL_TIERS) ---------- */

export const CARD_RARITIES = [
  'Common',
  'Uncommon',
  'Rare',
  'Epic',
  'Legendary',
  'Mythic',
  'Contraband',
] as const;
export type CardRarity = typeof CARD_RARITIES[number];

// Rarities that can actually be rolled inside a pack — matches
// PER_CARD_TIERS in the bot's config.js (Mythic and Contraband are
// perCard: false and are only ever granted via specific-card rewards).
export const PACK_RARITIES = [
  'Common',
  'Uncommon',
  'Rare',
  'Epic',
  'Legendary',
] as const;
export type PackRarity = typeof PACK_RARITIES[number];

/* ---------- collections (from bot config.js COLLECTION_CHOICES) ---------- */

export const CARD_COLLECTIONS = [
  { id: 'darcie',    label: 'Darcie' },
  { id: 'tobi',      label: 'Tobi' },
  { id: 'madolche',  label: 'Madolche' },
  { id: 'celestial', label: 'Celestial' },
  { id: 'lunalux',   label: 'LunaLux' },
  { id: 'halo',      label: 'Halo' },
] as const;

export type CollectionId = typeof CARD_COLLECTIONS[number]['id'];

/* ---------- custom packs (definitions) ---------- */

export type RarityFilter =
  | { mode: 'all' }
  | { mode: 'single'; rarity: PackRarity }
  | { mode: 'range'; min: PackRarity; max: PackRarity }
  | { mode: 'list'; rarities: PackRarity[] };

export type CollectionFilter =
  | { mode: 'any' }
  | { mode: 'specific'; collections: string[] }
  | { mode: 'distinct'; collections: string[] };

export type CustomPack = {
  id: string;
  name: string;
  cardCount: number;
  rarityFilter: RarityFilter;
  collectionFilter: CollectionFilter;
  createdAt: number;
  createdBy: string;
  updatedAt?: number;
};

/* ---------- pending loyalty packs (client view) ----------
 *
 * The bot stores the full generated card list under
 * `user_loyalty_packs:<discordId>` in KV. That record is server-side
 * only. The client view below intentionally omits `cards` — the user
 * must call /api/loyalty/open-pack to find out what's inside.
 */

export type PendingLoyaltyPack = {
  id: string;
  packId: string;
  packName: string;
  tier: number;
  createdAt: number;
};

/* ---------- reward kinds ---------- */

export type RewardKind =
  | { kind: 'pack_points'; amount: number }
  | { kind: 'card'; cardName: string; rarity: CardRarity }
  | { kind: 'pack'; packId: string }
  | { kind: 'minipack' }
  | { kind: 'custom' };

export type LoyaltyClaim = {
  tier: number;
  claimedAt: number;
  rewardKind: RewardKind;
  granted: boolean;
  manual?: boolean;
  description: string;
  pendingPackId?: string;
};
export type LoyaltyClaims = Record<string, LoyaltyClaim>;

/* ---------- tier shapes ---------- */

export type MergedTier = {
  tier: number;
  stardustRequired: number;
  band: TierBand;
  icon: string;
  title: string;
  description: string;
  reward: string;
  rewardKind?: RewardKind;
};

export type TierOverride = Partial<TierContent> & { rewardKind?: RewardKind };
export type TierOverrides = Record<string, TierOverride>;

export const TRACK_START_DATE = "2027-01-01T00:00:00Z";

export const MAJOR_ACTION_VALUE = 6800;
export const WEEKLY_BONUSES = {
  pack4: 100,
  pack8: 300,
  pack12PlusDrop: 620,
  pack16PlusDropPlusPuzzle: 660,
} as const;

export const TOTAL_TIERS = 50;
export const TOTAL_TRACK_COST = 200_000;

// Band structure preserved: 40% intro, 40% mid, 24% final stretch, plus
// the two "big push" tiers at 49 and 50. Totals exactly 200,000.
//
//   1-20   @ 2,000  =  40,000  (40%)
//   21-40  @ 4,000  =  80,000  (40%)
//   41-48  @ 6,000  =  48,000  (24%)
//   49     @ 14,000 =  14,000
//   50     @ 18,000 =  18,000
export const TIER_COSTS: number[] = (() => {
  const out: number[] = [];
  for (let i = 1; i <= TOTAL_TIERS; i++) {
    if (i <= 20) out.push(2_000);
    else if (i <= 40) out.push(4_000);
    else if (i <= 48) out.push(6_000);
    else if (i <= 49) out.push(14_000);
    else out.push(18_000);
  }
  return out;
})();

export const CUMULATIVE_COSTS: number[] = (() => {
  const out: number[] = [];
  let total = 0;
  for (const c of TIER_COSTS) { total += c; out.push(total); }
  return out;
})();

export function stardustForTier(tier: number): number {
  if (tier <= 0) return 0;
  if (tier > TOTAL_TIERS) tier = TOTAL_TIERS;
  return CUMULATIVE_COSTS[tier - 1];
}

export function tierForStardust(stardust: number): number {
  for (let i = CUMULATIVE_COSTS.length - 1; i >= 0; i--) {
    if (stardust >= CUMULATIVE_COSTS[i]) return i + 1;
  }
  return 0;
}

export function isTrackActive(now = Date.now()): boolean {
  return now >= new Date(TRACK_START_DATE).getTime();
}

// Bands were originally tuned for 100 tiers. With 50, they scale to:
//   intro: 1-16, early: 17-19, mid: 20-46, late: 47-49, final: 50
function bandForTier(tier: number): TierBand {
  if (tier <= 16) return 'intro';
  if (tier <= 19) return 'early';
  if (tier <= 46) return 'mid';
  if (tier <= 49) return 'late';
  return 'final';
}

const NAMED_TIERS: Record<number, TierContent> = {
  5:  { icon: '🥉', title: 'Bronze Badge',      description: 'Your first proper milestone.',                    reward: 'Bronze loyalty badge' },
  10: { icon: '✨', title: 'Shining',           description: 'Ten tiers of loyalty.',                           reward: 'Custom emote slot' },
  13: { icon: '🌿', title: 'Sprout',            description: 'One quarter of the way.',                         reward: 'Extra profile decoration slot' },
  16: { icon: '🌱', title: 'First Chapter',     description: 'Complete the intro tier band.',                   reward: 'First major milestone reward' },
  17: { icon: '⭐', title: 'Rising Star',       description: 'Past the first milestone.',                       reward: 'Exclusive badge colour' },
  19: { icon: '🌙', title: 'Moon Walker',       description: 'End of the early tier band.',                     reward: 'Bronze profile accent' },
  20: { icon: '🌠', title: 'Grind Begins',      description: 'Entering the long stretch.',                      reward: 'Star trail effect on profile' },
  25: { icon: '💫', title: 'Halfway',           description: 'Halfway through the loyalty journey.',            reward: 'Cosmic profile border' },
  38: { icon: '🌟', title: 'Nebula',            description: 'Three quarters of the way.',                      reward: 'Nebula profile theme' },
  45: { icon: '🔆', title: 'Almost There',      description: 'Five tiers from the top of the track.',           reward: 'Cosmic aura effect' },
  46: { icon: '🪐', title: 'Loyal Constellation', description: 'Completed the hard grind band.',                reward: 'Loyalty Card II (silver) + gold loyalty badge' },
  47: { icon: '🔭', title: 'Celestial',         description: 'Entering the highest tier band.',                 reward: 'Exclusive emote pack' },
  48: { icon: '✨', title: 'Astral Traveler',   description: 'Nearly to the end of the track.',                 reward: 'Animated profile decoration' },
  49: { icon: '🌠', title: 'Star Walker',       description: 'The penultimate tier.',                           reward: 'Loyalty Card III (gold) + platinum loyalty badge' },
  50: { icon: '🌌', title: 'Cosmic Ascendant',  description: 'The final tier. You have walked among the stars.', reward: 'Loyalty Card IV (platinum) + permanent place in the credits' },
};

export function getDefaultTier(tier: number): MergedTier {
  const stardust = stardustForTier(tier);
  const named = NAMED_TIERS[tier];
  if (named) {
    return { tier, stardustRequired: stardust, band: bandForTier(tier), ...named };
  }
  return {
    tier,
    stardustRequired: stardust,
    band: bandForTier(tier),
    icon: '⭐',
    title: `Tier ${tier}`,
    description: `Reach ${stardust.toLocaleString()} stardust.`,
    reward: `Tier ${tier} reward`,
  };
}

export function buildTier(tier: number, overrides: TierOverrides): MergedTier {
  const defaults = getDefaultTier(tier);
  const o = overrides[String(tier)] || {};
  return {
    ...defaults,
    icon: o.icon || defaults.icon,
    title: o.title || defaults.title,
    description: o.description || defaults.description,
    reward: o.reward || defaults.reward,
    rewardKind: o.rewardKind,
  };
}

export function buildAllTiers(overrides: TierOverrides): MergedTier[] {
  const out: MergedTier[] = [];
  for (let i = 1; i <= TOTAL_TIERS; i++) out.push(buildTier(i, overrides));
  return out;
}

/* ---------- icon parsing ---------- */

export type ParsedTierIcon =
  | { type: 'emoji'; value: string }
  | { type: 'emote'; id: string; animated: boolean; name: string }
  | { type: 'empty' };

export function parseTierIcon(icon: string | undefined | null): ParsedTierIcon {
  if (!icon || !icon.trim()) return { type: 'empty' };
  const m = String(icon).trim().match(/^<(a?):([\w~]+):(\d{15,25})>$/);
  if (m) {
    return { type: 'emote', id: m[3], animated: m[1] === 'a', name: m[2] };
  }
  return { type: 'emoji', value: String(icon) };
}

export function buildEmoteMarkup(id: string, name: string, animated: boolean): string {
  const safeName = String(name || 'emote').replace(/[^\w~]/g, '_');
  return animated ? `<a:${safeName}:${id}>` : `<:${safeName}:${id}>`;
}

/* ---------- theme ---------- */

export type LoyaltyTheme = {
  background: string;
  backgroundLight: string;
  accent: string;
  accentText: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  starLocked: string;
  starRegular: string;
  starFive: string;
  starTen: string;
  starMajor: string;
  starFinal: string;
  deco1: string;
  deco2: string;
  deco3: string;
  deco4: string;
  deco5: string;
  stringMid: string;
};

export const DEFAULT_THEME: LoyaltyTheme = {
  background: '#1B152F',
  backgroundLight: '#241B3E',
  accent: '#FED1F2',
  accentText: '#1B152F',
  textPrimary: '#FFFFFF',
  textSecondary: '#FED1F2',
  textMuted: '#A899B8',
  starLocked: '#B4A5C8',
  starRegular: '#FED1F2',
  starFive: '#FED1F2',
  starTen: '#FED1F2',
  starMajor: '#FED1F2',
  starFinal: '#FFFFFF',
  deco1: '#FED1F2',
  deco2: '#E5B8F0',
  deco3: '#C99EE8',
  deco4: '#B08BD5',
  deco5: '#D4A8DC',
  stringMid: '#FFFFFF',
};

export const THEME_GROUPS: { name: string; keys: { key: keyof LoyaltyTheme; label: string }[] }[] = [
  { name: 'Base', keys: [
    { key: 'background',      label: 'Background' },
    { key: 'backgroundLight', label: 'Background (lighter)' },
  ]},
  { name: 'Accent', keys: [
    { key: 'accent',     label: 'Accent' },
    { key: 'accentText', label: 'Text on accent' },
  ]},
  { name: 'Text', keys: [
    { key: 'textPrimary',   label: 'Primary text' },
    { key: 'textSecondary', label: 'Secondary text' },
    { key: 'textMuted',     label: 'Muted text' },
  ]},
  { name: 'Stars', keys: [
    { key: 'starLocked',  label: 'Locked' },
    { key: 'starRegular', label: 'Regular (unlocked)' },
    { key: 'starFive',    label: '5-multiples' },
    { key: 'starTen',     label: '10-multiples' },
    { key: 'starMajor',   label: 'Major (every 4th)' },
    { key: 'starFinal',   label: 'Tier 50' },
  ]},
  { name: 'Background strings', keys: [
    { key: 'deco1', label: 'String 1' },
    { key: 'deco2', label: 'String 2' },
    { key: 'deco3', label: 'String 3' },
    { key: 'deco4', label: 'String 4' },
    { key: 'deco5', label: 'String 5' },
    { key: 'stringMid', label: 'Main string (middle)' },
  ]},
];

export function hexToRgba(hex: string, alpha: number): string {
  const h = String(hex || '').replace('#', '').trim();
  if (!h) return `rgba(255, 255, 255, ${alpha})`;
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  if (full.length !== 6) return `rgba(255, 255, 255, ${alpha})`;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some(n => Number.isNaN(n))) return `rgba(255, 255, 255, ${alpha})`;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function themeCssVars(theme: LoyaltyTheme): Record<string, string> {
  return {
    '--lt-bg': theme.background,
    '--lt-bg-light': theme.backgroundLight,
    '--lt-accent': theme.accent,
    '--lt-accent-text': theme.accentText,
    '--lt-text-primary': theme.textPrimary,
    '--lt-text-secondary': theme.textSecondary,
    '--lt-text-muted': theme.textMuted,
    '--lt-accent-03': hexToRgba(theme.accent, 0.03),
    '--lt-accent-05': hexToRgba(theme.accent, 0.05),
    '--lt-accent-06': hexToRgba(theme.accent, 0.06),
    '--lt-accent-08': hexToRgba(theme.accent, 0.08),
    '--lt-accent-10': hexToRgba(theme.accent, 0.1),
    '--lt-accent-12': hexToRgba(theme.accent, 0.12),
    '--lt-accent-14': hexToRgba(theme.accent, 0.14),
    '--lt-accent-15': hexToRgba(theme.accent, 0.15),
    '--lt-accent-18': hexToRgba(theme.accent, 0.18),
    '--lt-accent-20': hexToRgba(theme.accent, 0.2),
    '--lt-accent-22': hexToRgba(theme.accent, 0.22),
    '--lt-accent-25': hexToRgba(theme.accent, 0.25),
    '--lt-accent-30': hexToRgba(theme.accent, 0.3),
    '--lt-accent-35': hexToRgba(theme.accent, 0.35),
    '--lt-accent-40': hexToRgba(theme.accent, 0.4),
    '--lt-accent-45': hexToRgba(theme.accent, 0.45),
    '--lt-accent-50': hexToRgba(theme.accent, 0.5),
    '--lt-accent-55': hexToRgba(theme.accent, 0.55),
    '--lt-accent-60': hexToRgba(theme.accent, 0.6),
    '--lt-accent-70': hexToRgba(theme.accent, 0.7),
    '--lt-accent-85': hexToRgba(theme.accent, 0.85),
    '--lt-accent-90': hexToRgba(theme.accent, 0.9),
    '--lt-accent-95': hexToRgba(theme.accent, 0.95),
    '--lt-bg-80': hexToRgba(theme.background, 0.8),
    '--lt-bg-90': hexToRgba(theme.background, 0.9),
    '--lt-bg-light-50': hexToRgba(theme.backgroundLight, 0.5),
    '--lt-bg-light-90': hexToRgba(theme.backgroundLight, 0.9),
  };
}
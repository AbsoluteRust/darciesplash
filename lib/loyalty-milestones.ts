// lib/loyalty-milestones.ts

export type TierBand = 'intro' | 'early' | 'mid' | 'late' | 'final';

export type TierContent = {
  icon: string;
  title: string;
  description: string;
  reward: string;
};

export type MergedTier = {
  tier: number;
  stardustRequired: number;
  band: TierBand;
  icon: string;
  title: string;
  description: string;
  reward: string;
};

export type TierOverride = Partial<TierContent>;
export type TierOverrides = Record<string, TierOverride>;

export const TRACK_START_DATE = "2027-01-01T00:00:00Z";

export const MAJOR_ACTION_VALUE = 6800;
export const WEEKLY_BONUSES = {
  pack4: 100,
  pack8: 300,
  pack12PlusDrop: 620,
  pack16PlusDropPlusPuzzle: 660,
} as const;

export const TOTAL_TIERS = 100;
export const TOTAL_TRACK_COST = 200_000;

export const TIER_COSTS: number[] = (() => {
  const out: number[] = [];
  for (let i = 1; i <= TOTAL_TIERS; i++) {
    if (i <= 39) out.push(1000);
    else if (i <= 96) out.push(2500);
    else if (i <= 99) out.push(4000);
    else out.push(6500);
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

function bandForTier(tier: number): TierBand {
  if (tier <= 32) return 'intro';
  if (tier <= 39) return 'early';
  if (tier <= 96) return 'mid';
  if (tier <= 99) return 'late';
  return 'final';
}

const NAMED_TIERS: Record<number, TierContent> = {
  10:  { icon: '🥉', title: 'Bronze Badge',      description: 'Your first proper milestone.',                    reward: 'Bronze loyalty badge' },
  20:  { icon: '✨', title: 'Shining',           description: 'Twenty tiers of loyalty.',                        reward: 'Custom emote slot' },
  25:  { icon: '🌿', title: 'Sprout',            description: 'One quarter of the way.',                         reward: 'Extra profile decoration slot' },
  32:  { icon: '🌱', title: 'First Chapter',     description: 'Complete the intro tier band.',                   reward: 'First major milestone reward' },
  33:  { icon: '⭐', title: 'Rising Star',       description: 'Past the first milestone.',                       reward: 'Exclusive badge colour' },
  39:  { icon: '🌙', title: 'Moon Walker',       description: 'End of the early tier band.',                     reward: 'Bronze profile accent' },
  40:  { icon: '🌠', title: 'Grind Begins',      description: 'Entering the long stretch.',                      reward: 'Star trail effect on profile' },
  50:  { icon: '💫', title: 'Halfway',           description: 'Halfway through the loyalty journey.',            reward: 'Cosmic profile border' },
  75:  { icon: '🌟', title: 'Nebula',            description: 'Three quarters of the way.',                      reward: 'Nebula profile theme' },
  90:  { icon: '🔆', title: 'Almost There',      description: 'Ten tiers from the top of the grind band.',       reward: 'Cosmic aura effect' },
  96:  { icon: '🪐', title: 'Loyal Constellation', description: 'Completed the hard grind band.',                reward: 'Loyalty Card II (silver) + gold loyalty badge' },
  97:  { icon: '🔭', title: 'Celestial',         description: 'Entering the highest tier band.',                 reward: 'Exclusive emote pack' },
  98:  { icon: '✨', title: 'Astral Traveler',   description: 'Nearly to the end of the track.',                 reward: 'Animated profile decoration' },
  99:  { icon: '🌠', title: 'Star Walker',       description: 'The penultimate tier.',                           reward: 'Loyalty Card III (gold) + platinum loyalty badge' },
  100: { icon: '🌌', title: 'Cosmic Ascendant',  description: 'The final tier. You have walked among the stars.', reward: 'Loyalty Card IV (platinum) + permanent place in the credits' },
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
  };
}

export function buildAllTiers(overrides: TierOverrides): MergedTier[] {
  const out: MergedTier[] = [];
  for (let i = 1; i <= TOTAL_TIERS; i++) out.push(buildTier(i, overrides));
  return out;
}

/* ---------- theme ---------- */

export type LoyaltyTheme = {
  // base
  background: string;
  backgroundLight: string;
  // accent (used everywhere for emphasis / borders / buttons / stars)
  accent: string;
  accentText: string;
  // text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  // star tier colours (each is a base hex; stroke = full colour, fill = ~28% opacity)
  starLocked: string;
  starRegular: string;
  starFive: string;
  starTen: string;
  starMajor: string;
  starFinal: string;
  // background strings
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
  {
    name: 'Base',
    keys: [
      { key: 'background',      label: 'Background' },
      { key: 'backgroundLight', label: 'Background (lighter)' },
    ],
  },
  {
    name: 'Accent',
    keys: [
      { key: 'accent',     label: 'Accent' },
      { key: 'accentText', label: 'Text on accent' },
    ],
  },
  {
    name: 'Text',
    keys: [
      { key: 'textPrimary',   label: 'Primary text' },
      { key: 'textSecondary', label: 'Secondary text' },
      { key: 'textMuted',     label: 'Muted text' },
    ],
  },
  {
    name: 'Stars',
    keys: [
      { key: 'starLocked',  label: 'Locked' },
      { key: 'starRegular', label: 'Regular (unlocked)' },
      { key: 'starFive',    label: '5-multiples' },
      { key: 'starTen',     label: '10-multiples' },
      { key: 'starMajor',   label: 'Major (every 8th)' },
      { key: 'starFinal',   label: 'Tier 100' },
    ],
  },
  {
    name: 'Background strings',
    keys: [
      { key: 'deco1', label: 'String 1' },
      { key: 'deco2', label: 'String 2' },
      { key: 'deco3', label: 'String 3' },
      { key: 'deco4', label: 'String 4' },
      { key: 'deco5', label: 'String 5' },
      { key: 'stringMid', label: 'Main string (middle)' },
    ],
  },
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
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

// Per-tier cost (non-decreasing by band).
// 1–32: 1000 each (32,000)
// 33–39: 1000 each (7,000)  → cumulative 39,000
// 40–96: 2500 each (142,500) → cumulative 181,500
// 97–99: 4000 each (12,000)  → cumulative 193,500
// 100:   6500                → cumulative 200,000
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
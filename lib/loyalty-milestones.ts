// lib/loyalty-milestones.ts

export type MilestoneType = 'sub' | 'referral' | 'gift' | 'commissioner';

export type Milestone = {
  id: string;
  type: MilestoneType;
  threshold: number;
  icon: string;
  label: string;
  title: string;
  description: string;
  reward: string;
};

export const MILESTONE_TYPES: { id: MilestoneType; label: string; unit: string }[] = [
  { id: 'sub',          label: 'Subscription',     unit: 'months' },
  { id: 'referral',     label: 'Referrals',        unit: 'referrals' },
  { id: 'gift',         label: 'Gifts sent',       unit: 'gifts' },
  { id: 'commissioner', label: 'Commissioner',     unit: '' },
];

export const DEFAULT_MILESTONES: Milestone[] = [
  { id: 'sub-1',       type: 'sub',          threshold: 1,  icon: '🌙', label: '1 month',         title: 'First Light',        description: 'Your first month of continuous support.',       reward: 'Darsubscribbler role + profile badge' },
  { id: 'ref-1',       type: 'referral',     threshold: 1,  icon: '🌠', label: 'First referral',  title: 'Star Finder',        description: 'Brought your first friend to the server.',      reward: 'Access to the referral leaderboard' },
  { id: 'gift-5',      type: 'gift',         threshold: 5,  icon: '🎁', label: '5 gifts',         title: 'Gift Giver',         description: 'Sent 5 gifts to the community.',                reward: 'Exclusive emote pack' },
  { id: 'sub-3',       type: 'sub',          threshold: 3,  icon: '✨', label: '3 months',        title: 'Constellation',      description: 'Three months of loyalty.',                      reward: 'Bronze profile accent + exclusive badge colour' },
  { id: 'ref-5',       type: 'referral',     threshold: 5,  icon: '💫', label: '5 referrals',     title: 'Supernova',          description: 'Five friends joined through you.',              reward: '5,000 bonus points' },
  { id: 'sub-6',       type: 'sub',          threshold: 6,  icon: '🌟', label: '6 months',        title: 'Nebula',             description: 'Half a year of support.',                       reward: 'Nebula profile theme' },
  { id: 'gift-10',     type: 'gift',         threshold: 10, icon: '🌌', label: '10 gifts',        title: 'Star Bearer',        description: 'Ten gifts shared with others.',                 reward: 'Custom emote slot for the server' },
  { id: 'sub-12',      type: 'sub',          threshold: 12, icon: '🪐', label: '1 year',          title: 'Galaxy',             description: 'A full year of continuous support.',            reward: 'Loyalty Card I (bronze) + silver loyalty badge' },
  { id: 'commission',  type: 'commissioner', threshold: 1,  icon: '🎨', label: 'Commissioner',    title: 'Patron of Art',      description: 'Commissioned a piece from Darcie.',             reward: 'Private commission channel + referral code' },
  { id: 'ref-15',      type: 'referral',     threshold: 15, icon: '🔭', label: '15 referrals',    title: 'Cosmic Curator',     description: 'Fifteen friends brought in.',                   reward: 'Animated profile decoration' },
  { id: 'sub-24',      type: 'sub',          threshold: 24, icon: '🌠', label: '2 years',         title: 'Solar System',       description: 'Two years of continuous support.',              reward: 'Loyalty Card II (silver) + gold loyalty badge' },
  { id: 'sub-36',      type: 'sub',          threshold: 36, icon: '⭐', label: '3 years',         title: 'Stellar Loyalty',    description: 'Three years of continuous support.',            reward: 'Loyalty Card III (gold) + platinum loyalty badge' },
  { id: 'sub-60',      type: 'sub',          threshold: 60, icon: '🌌', label: '5 years',         title: 'Eternal',            description: 'Five years of continuous support.',             reward: 'Loyalty Card IV (platinum) + name in permanent credits' },
];
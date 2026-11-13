// lib/darsubscriber-features.ts

export type DarsubscriberFeature = {
  id: string;
  icon: string;
  title: string;
  description: string;
  location?: string;
};

export const DARSUBSCRIBBLER_FEATURES: DarsubscriberFeature[] = [
  {
    id: 'animated-cards',
    icon: '✨',
    title: 'Animated card pulls',
    description:
      'Pull and collect cards with animated GIF artwork, and see them animate on every reveal. Non-subscribers can only pull static versions.',
    location: '/play',
  },
  {
    id: 'custom-color',
    icon: '🎨',
    title: 'Custom name colour',
    description:
      'Choose any colour for your name. It becomes a matching Discord role and shows everywhere on the site — profile, leaderboards, collections.',
    location: 'Your profile → ✎ next to your name',
  },
  {
    id: 'edit-showcase',
    icon: '🖼️',
    title: 'Editable showcase',
    description:
      'Pick up to eight commissions to display on your profile. Subscribers can edit their showcase at any time.',
    location: 'Your profile → Commissions tab',
  },
  {
    id: 'pack-cap',
    icon: '📈',
    title: 'Higher pack-point cap',
    description:
      'Your pack point balance can reach 500,000 instead of the base 200,000 cap — so daily awards never overflow and you never miss out.',
    location: 'Profile → Pack points',
  },
  {
    id: 'daily-bonus',
    icon: '💜',
    title: 'Daily Darsubscriber bonus',
    description:
      'Every day’s automatic points payout includes an extra Darsubscriber-only bonus on top of your streaks, guild bonus, and community servers.',
    location: 'Profile → Streak breakdown',
  },
  {
    id: 'copy-emotes',
    icon: '📋',
    title: 'Copy collection emotes',
    description:
      'Copy every emote from a collection to your clipboard in one click — ready to paste into Discord as usable emotes.',
    location: 'Collections → any collection page',
  },
  {
    id: 'collection-ownership',
    icon: '🏷️',
    title: 'Collection ownership',
    description:
      'Claim ownership of a collection and rename it, so it shows under your chosen title everywhere the collection appears.',
    location: 'Collections → any collection page',
  },
];
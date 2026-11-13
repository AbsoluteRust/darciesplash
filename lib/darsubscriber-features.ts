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
      'Pull and collect cards with animated GIF artwork, and see them animate on every reveal. Without Darsubscribbler status, cards appear as static images only.',
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
      'Curate up to eight commissions to display at the top of your profile, showcasing your favourite pieces to anyone who visits.',
    location: 'Your profile → Commissions tab → Edit Showcase',
  },
  {
    id: 'pack-cap',
    icon: '📈',
    title: 'Higher pack-point cap',
    description:
      'Bank up to 500,000 pack points instead of the base 200,000 cap. Daily awards, streak bonuses, and pack drops keep landing even when you’re already near the ceiling.',
    location: 'Profile → Pack points',
  },
  {
    id: 'daily-bonus',
    icon: '💜',
    title: 'Daily Darsubscribbler bonus',
    description:
      'Every day’s automatic points payout includes an extra Darsubscribbler-only bonus on top of your streaks, guild bonus, and community servers.',
    location: 'Profile → Streak breakdown',
  },
  {
    id: 'copy-emotes',
    icon: '📋',
    title: 'Copy collection emotes',
    description:
      'Copy any emote from a collection to your clipboard as Discord-ready markdown, in one click — no more rehosting or reuploading.',
    location: 'Collections → any emote card → 📋',
  },
  {
    id: 'collection-ownership',
    icon: '🏷️',
    title: 'Collection editing',
    description:
      'If you own a collection, you can reorder its cards, set a custom sort, group them into sections, and rename the collection itself.',
    location: 'Collections you own → ✏️ Edit order',
  },
];
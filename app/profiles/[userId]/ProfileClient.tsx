'use client';

import { useEffect, useState, useRef } from 'react';
import { useCollectionFilter } from '@/components/CollectionFilterContext';
import { motion, AnimatePresence } from 'motion/react';
import ProfileCard from '@/components/ProfileCard';

type StreakSource = {
  id: string;
  label: string;
  points: number;
  description: string;
  current: number | null;
  max: number | null;
  nextClaimAt: number | null;
  servers?: { id: string; name: string; icon: string; inviteUrl: string; joined: boolean }[];
};

type StardustWeek = {
  tier: number;
  packs: number;
  drops: number;
  puzzles: number;
  weekEarned: number;
  weekKey: string;
  featureStartsAt: number;
  active: boolean;
};

type ProfileData = {
  id: string;
  name: string;
  avatarUrl: string;
  isOnline: boolean;
  isDarsubscribbler?: boolean;
  customColor: string | null;
  favorites?: string[];
  badgeOverrides?: Record<string, any>;
  achievements?: any[];
  featuredBadgeId?: string | null;
  badges: {
    gifts: number;
    referrals: number;
    subMonths: number;
    isCommissioner: boolean;
    loyalty: string[];
  };
  emotes: {
    heart: string | null;
    sparkle: string | null;
    gift: string | null;
    banana: string | null;
    love: string | null;
  };
  stats?: {
    stardust: number;
    collectorPoints: number;
    packPoints: number;
    streakTotal: number;
    streakScore: number;
    streakBreakdown: StreakSource[];
    stardustWeek?: StardustWeek | null;
  };
  inventory?: Record<string, number>;
};

type CardData = {
  name: string;
  type: string;
  image: string;
  thumbUrl?: string;
  glow?: string;
  rarity?: string;
  collection?: string;
  contraband?: boolean;
};

const DEFAULT_HIGHLIGHT = '#6366f1';
const STARDUST_FEATURE_START = Date.UTC(2027, 0, 1); // Jan 1 2027 00:00:00 UTC
const MAJOR_ACTION_STARDUST = 6800;
const STARDUST_WEEK_MAX = 660;
const KOFI_TIERS_URL = 'https://ko-fi.com/dardotdlc/tiers';

// Pack point caps (mirror config.js)
const PACK_POINTS_CAP_BASE = 200_000;
const PACK_POINTS_CAP_PREMIUM = 500_000;

const STARDUST_TIERS = [
  { num: 1, reqPacks: 4,  reqDrops: 0, reqPuzzles: 0, reward: 100, desc: 'Open 4 packs' },
  { num: 2, reqPacks: 8,  reqDrops: 0, reqPuzzles: 0, reward: 300, desc: 'Open 8 packs' },
  { num: 3, reqPacks: 12, reqDrops: 1, reqPuzzles: 0, reward: 620, desc: 'Open 12 packs + catch 1 drop' },
  { num: 4, reqPacks: 16, reqDrops: 1, reqPuzzles: 1, reward: 660, desc: 'Open 16 packs + catch 1 drop + solve 1 puzzle' },
];

type MajorAction = {
  id: string;
  label: string;
  icon: string;
  subtitle: string;
  href?: string;
  hrefLabel?: string;
};

const MAJOR_ACTIONS: MajorAction[] = [
  { id: 'referral',     label: 'Referral',     icon: '🍌', subtitle: 'Infinitely repeatable' },
  { id: 'subscription', label: 'Subscription', icon: '💖', subtitle: 'Repeatable once per month', href: KOFI_TIERS_URL, hrefLabel: 'Subscribe on Ko-fi' },
  { id: 'gift',         label: 'Gift',         icon: '🎁', subtitle: 'Infinitely repeatable' },
  { id: 'commission',   label: 'Commission',   icon: '✨', subtitle: 'Infinitely repeatable' },
];

function formatSubTime(months: number) {
  if (months < 12) return `${months} Month${months === 1 ? '' : 's'}`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `${years} Year${years === 1 ? '' : 's'}`;
  return `${years} Year${years === 1 ? '' : 's'}, ${rem} Month${rem === 1 ? '' : 's'}`;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0s';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (d > 0 || h > 0) parts.push(`${h}h`);
  if (d > 0 || h > 0 || m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

function CustomBadgeIcon({ 
  badgeKey, 
  progress,
  defaultEmoteId, 
  defaultFallback, 
  overrides, 
  className = "w-8 h-8" 
}: { 
  badgeKey: string; 
  progress?: number;
  defaultEmoteId: string | null | undefined; 
  defaultFallback: string; 
  overrides: Record<string, any> | undefined | null;
  className?: string;
}) {
  const custom = overrides?.[badgeKey];
  
  let iconUrl = null;
  if (custom?.tiers && progress !== undefined) {
    const thresholds = [1, 3, 6, 12, 24, 36, 60]; 
    let activeTierIdx = -1;
    for (let i = 0; i < thresholds.length; i++) {
      if (progress >= thresholds[i] && custom.tiers[i]?.iconUrl) {
        activeTierIdx = i;
      }
    }
    if (activeTierIdx !== -1) {
      iconUrl = custom.tiers[activeTierIdx].iconUrl;
    }
  }

  if (!iconUrl && typeof custom?.iconUrl === 'string') {
    iconUrl = custom.iconUrl;
  }

  if (iconUrl) {
    if (iconUrl.startsWith('http')) return <img src={iconUrl} alt="badge" className={`${className} object-contain`} />;
    const match = iconUrl.match(/<(a?):(\w+):(\d+)>/);
    if (match) return <img src={`https://cdn.discordapp.com/emojis/${match[3]}.${match[1] === 'a' ? 'gif' : 'png'}`} alt="badge" className={`${className} object-contain`} />;
    return <span className={`${className} flex items-center justify-center text-xl`}>{iconUrl}</span>;
  }

  if (defaultEmoteId) return <img src={`https://cdn.discordapp.com/emojis/${defaultEmoteId}.png`} alt="badge" className={`${className} object-contain`} />;
  return <span className={`${className} flex items-center justify-center text-xl`}>{defaultFallback}</span>;
}

export default function ProfileClient({ userId }: { userId: string }) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [allCards, setAllCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'commissions' | 'points' | 'badges' | 'achievements'>('commissions');
  const [now, setNow] = useState(Date.now());
  const [showLockedBadges, setShowLockedBadges] = useState(false);
  const [showLockedAchievements, setShowLockedAchievements] = useState(false);
  
  const { userId: currentUserId, roles } = useCollectionFilter();
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [savingColor, setSavingColor] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [isEditingFavorites, setIsEditingFavorites] = useState(false);
  const [tempFavorites, setTempFavorites] = useState<Set<string>>(new Set());
  const [isSavingFavorites, setIsSavingFavorites] = useState(false);

  const isOwnProfile = currentUserId === userId;
  const canEdit = isOwnProfile && roles?.darsubscribbler;

  useEffect(() => { const int = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(int); }, []);

  const fetchProfile = async () => {
    try {
      const [profileRes, cardsRes] = await Promise.all([
        fetch(`/api/profiles/${userId}?t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/cards/list`, { cache: 'no-store' })
      ]);
      if (profileRes.ok) {
        const json = await profileRes.json();
        setData(json);
        if (json.customColor) setSelectedColor(json.customColor);
      }
      if (cardsRes.ok) setAllCards(await cardsRes.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchProfile(); const int = setInterval(fetchProfile, 30000); return () => clearInterval(int); }, [userId]);

  const handleSaveColor = async () => { setSavingColor(true); try { const res = await fetch('/api/profiles/color', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ colorHex: selectedColor }) }); if (res.ok) { setIsColorModalOpen(false); fetchProfile(); } else { const errData = await res.json(); alert(`Failed to save color: ${errData.error || 'Unknown error'}`); } } finally { setSavingColor(false); } };
  const handleSaveFavorites = async () => { setIsSavingFavorites(true); const newFavs = Array.from(tempFavorites); try { const res = await fetch('/api/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardNames: newFavs }) }); if (!res.ok) throw new Error(`HTTP error ${res.status}`); setData(prev => prev ? { ...prev, favorites: newFavs } : prev); setIsEditingFavorites(false); } catch (err: any) { alert(`Failed to save showcase: ${err.message}`); } finally { setIsSavingFavorites(false); } };
  const toggleFavorite = (cardName: string) => { setTempFavorites(prev => { const next = new Set(prev); if (next.has(cardName)) next.delete(cardName); else { if (next.size >= 8) { alert("You can only select up to 8 cards."); return prev; } next.add(cardName); } return next; }); };

  const handleSetFeaturedBadge = async (badgeId: string | null) => {
    try {
      const res = await fetch('/api/profiles/featured-badge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badgeId }),
      });
      if (res.ok) {
        setData(prev => prev ? { ...prev, featuredBadgeId: badgeId } : prev);
      } else {
        alert('Failed to feature badge.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="text-white/50 text-center animate-pulse mt-20">Loading profile...</div>;
  if (!data) return <div className="text-red-400 text-center mt-20">User not found.</div>;

  const payoutSources = data.stats?.streakBreakdown?.filter(s => ['base', 'guild', 'commissioner', 'darsubscribbler', 'weekly-bonus', 'monthly-bonus', 'community'].includes(s.id)) || [];
  const streakScore = data.stats?.streakScore || 0;
  const tierCount = Math.floor(streakScore / 1000);
  const currentProgress = streakScore % 1000;

  // --- Pack point cap ---
  const isCommissioner = data.badges?.isCommissioner ?? false;
  const isDarsubscribbler = data.isDarsubscribbler ?? false;
  const hasIncreasedCap = isCommissioner || isDarsubscribbler;
  const packPointsCap = hasIncreasedCap ? PACK_POINTS_CAP_PREMIUM : PACK_POINTS_CAP_BASE;
  const currentPackPoints = data.stats?.packPoints ?? 0;
  const overCap = currentPackPoints > packPointsCap;

  // --- Stardust weekly ---
  const stardustWeek = data.stats?.stardustWeek || null;
  const featureStartsAt = stardustWeek?.featureStartsAt ?? STARDUST_FEATURE_START;
  const stardustActive = (stardustWeek?.active ?? false) && now >= featureStartsAt;
  const currentStardustTier = stardustWeek?.tier ?? 0;
  const weekPacks = stardustWeek?.packs ?? 0;
  const weekDrops = stardustWeek?.drops ?? 0;
  const weekPuzzles = stardustWeek?.puzzles ?? 0;
  const weekEarned = stardustWeek?.weekEarned ?? 0;

  // --- BADGE LOGIC ---
  const earnedBadges: any[] = [];
  const lockedBadges: any[] = [];

  if ((data.badges?.subMonths || 0) > 0) earnedBadges.push({ key: 'heart', progress: data.badges.subMonths, title: `Subscribed: ${formatSubTime(data.badges.subMonths)}`, label: 'Subscriber', defaultEmote: data.emotes?.heart, fallback: '💖' });
  else lockedBadges.push({ key: 'heart', title: 'Subscribe to unlock', label: 'Subscriber', defaultEmote: data.emotes?.heart, fallback: '💖' });

  if (data.badges?.isCommissioner) earnedBadges.push({ key: 'sparkle', progress: 1, title: 'Commissioner', label: 'Commissioner', defaultEmote: data.emotes?.sparkle, fallback: '✨' });
  else lockedBadges.push({ key: 'sparkle', title: 'Commission art to unlock', label: 'Commissioner', defaultEmote: data.emotes?.sparkle, fallback: '✨' });

  if ((data.badges?.gifts || 0) > 0) earnedBadges.push({ key: 'gift', progress: data.badges.gifts, title: `${data.badges.gifts} Gifts Sent`, label: 'Gifter', defaultEmote: data.emotes?.gift, fallback: '🎁' });
  else lockedBadges.push({ key: 'gift', title: 'Send a gift to unlock', label: 'Gifter', defaultEmote: data.emotes?.gift, fallback: '🎁' });

  if ((data.badges?.referrals || 0) > 0) earnedBadges.push({ key: 'banana', progress: data.badges.referrals, title: `${data.badges.referrals} Referrals`, label: 'Referrals', defaultEmote: data.emotes?.banana, fallback: '🍌' });
  else lockedBadges.push({ key: 'banana', title: 'Refer a friend to unlock', label: 'Referrals', defaultEmote: data.emotes?.banana, fallback: '🍌' });

  (data.badges?.loyalty || []).forEach(year => {
    earnedBadges.push({ key: 'love', progress: 1, title: `${year} Loyalty Card`, label: 'Loyalty', defaultEmote: data.emotes?.love, fallback: '💜' });
  });
  
  // --- ACHIEVEMENT LOGIC ---
  const unlockedAchievements = data.achievements?.filter(a => a.unlocked) || [];
  const lockedAchievements = data.achievements?.filter(a => !a.unlocked) || [];
  const featuredAchievement = unlockedAchievements.find(a => a.id === data.featuredBadgeId);

  const getHighlightColor = (ach: any): string =>
    data.badgeOverrides?.[ach.id]?.color || ach.color || DEFAULT_HIGHLIGHT;

  const featuredColor = featuredAchievement ? getHighlightColor(featuredAchievement) : DEFAULT_HIGHLIGHT;

  return (
    <div className="flex flex-col gap-8 w-full">
      <style dangerouslySetInnerHTML={{__html: `
        .profile-commission-card .avatar, .profile-commission-card .pc-avatar-crop,
        .profile-commission-card .pc-avatar-content, .profile-commission-card .pc-content,
        .profile-commission-card .pc-inside, .profile-commission-card .pc-card {
          filter: none !important; -webkit-filter: none !important;
          mix-blend-mode: normal !important; opacity: 1 !important;
        }
        .profile-commission-card .pc-shine, .profile-commission-card .pc-glare, .profile-commission-card .pc-behind {
          display: none !important;
        }
      `}} />

      {/* ─── TOP SECTION (Profile Header) ─── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0a0a14]/80 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-indigo-500/10 blur-[100px] pointer-events-none" />
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="relative">
            <img src={data.avatarUrl} alt={data.name} className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white/10 shadow-lg object-cover bg-black/50" />
            {data.isOnline && <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-[#0a0a14] rounded-full shadow-lg" title="Online on Website" />}
          </div>

          <div className="flex flex-col items-center md:items-start flex-1">
            <div className="flex items-center gap-3 mb-4">
              {data.customColor ? (
                <h1 className="text-3xl md:text-5xl font-black" style={{ color: data.customColor }}>{data.name}</h1>
              ) : (
                <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">{data.name}</h1>
              )}
              {canEdit && (
                <button onClick={() => setIsColorModalOpen(true)} className="text-white/30 hover:text-white/80 transition-colors p-2" title="Edit Name Color">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-4 items-center">
              {earnedBadges.map((badge, i) => (
                <div key={`earned-${i}`} className="group relative flex items-center justify-center cursor-help hover:scale-110 transition-transform">
                  <CustomBadgeIcon badgeKey={badge.key} progress={badge.progress} defaultEmoteId={badge.defaultEmote} defaultFallback={badge.fallback} overrides={data.badgeOverrides} className="w-10 h-10 md:w-12 md:h-12 drop-shadow-lg" />
                  <span className="absolute -bottom-10 bg-black/90 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10 z-50">
                    {badge.title}
                  </span>
                </div>
              ))}
              
              {featuredAchievement && (
                <div className="group relative flex items-center justify-center cursor-help hover:scale-110 transition-transform ml-2 border-l border-white/10 pl-4">
                  <div
                    className="w-10 h-10 md:w-12 md:h-12 rounded-xl border flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${featuredColor}33, ${featuredColor}1a)`,
                      borderColor: `${featuredColor}80`,
                      boxShadow: `0 0 15px ${featuredColor}66`,
                    }}
                  >
                    <CustomBadgeIcon badgeKey={featuredAchievement.id} defaultEmoteId={null} defaultFallback="🏆" overrides={data.badgeOverrides} className="w-6 h-6 md:w-8 md:h-8" />
                  </div>
                  <span className="absolute -bottom-10 bg-black/90 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10 z-50">
                    {data.badgeOverrides?.[featuredAchievement.id]?.name || featuredAchievement.label}
                  </span>
                </div>
              )}

              {earnedBadges.length === 0 && !featuredAchievement && (
                <span className="text-white/30 text-sm italic">No badges unlocked yet.</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── TABS NAVIGATION ─── */}
      <div className="flex justify-center w-full">
        <div className="flex bg-[#0a0a14]/80 border border-white/10 rounded-full p-1 backdrop-blur-xl">
          {(['commissions', 'points', 'badges', 'achievements'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2.5 rounded-full text-sm font-bold capitalize transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>{tab}</button>
          ))}
        </div>
      </div>

      {/* ─── TAB CONTENT ─── */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="w-full">
          
          {/* COMMISSIONS TAB */}
          {activeTab === 'commissions' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Showcase</h2>
                {canEdit && <button onClick={() => { setTempFavorites(new Set(data.favorites || [])); setIsEditingFavorites(true); }} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-bold transition">Edit Showcase</button>}
              </div>
              {(!data.favorites || data.favorites.length === 0) ? (
                <div className="text-center py-20 text-white/40 italic bg-white/[0.02] border border-white/5 rounded-3xl">{canEdit ? "You haven't showcased any commissions yet." : "No commissions showcased."}</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {allCards.filter(c => data.favorites?.includes(c.name)).map((card) => (
                    <div key={card.name} className="w-full profile-commission-card relative cursor-pointer" style={{ aspectRatio: '0.718' }}>
                      <ProfileCard name={card.name} title={card.type} handle={card.name.toLowerCase().replace(/\s+/g, "-")} status="" contactText="" avatarUrl={card.image} rarity={undefined} showUserInfo={false} enableTilt={true} enableMobileTilt={false} behindGlowEnabled={false} innerGradient="none" onContactClick={() => setSelectedCard(card)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* POINTS TAB */}
          {activeTab === 'points' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-[#0a0a14]/80 border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
                <p className="text-white/40 uppercase tracking-widest text-xs font-bold mb-2">Stardust</p>
                <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">{data.stats?.stardust?.toLocaleString() || '0'}</p>
              </div>
              <div className="bg-[#0a0a14]/80 border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
                <p className="text-white/40 uppercase tracking-widest text-xs font-bold mb-2">Collector Points</p>
                <p className="text-4xl font-black text-white">{data.stats?.collectorPoints?.toLocaleString() || '0'}</p>
              </div>
              <div className={`bg-[#0a0a14]/80 border rounded-3xl p-6 flex flex-col justify-between ${overCap ? 'border-amber-500/40' : 'border-white/10'}`}>
                <div className="flex justify-between items-start mb-2">
                  <p className="text-white/40 uppercase tracking-widest text-xs font-bold">Pack Points</p>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${hasIncreasedCap ? 'text-indigo-400/80' : 'text-white/30'}`}>
                    {hasIncreasedCap ? '500K cap' : '200K cap'}
                  </span>
                </div>
                <div>
                  <p className="text-4xl font-black text-white">{currentPackPoints.toLocaleString()}</p>
                  <p className={`text-xs mt-1 ${overCap ? 'text-amber-400 font-bold' : 'text-white/40'}`}>
                    {overCap ? 'Over cap — spend to earn more' : `of ${packPointsCap.toLocaleString()}`}
                  </p>
                </div>
              </div>

              <div className="col-span-1 lg:col-span-3 flex flex-col gap-6">

                {/* ─── WEEKLY STARDUST ─── */}
                <div className="bg-[#0a0a14]/80 border border-white/10 rounded-3xl p-6">
                  <div className="mb-4">
                    <p className="text-white/40 uppercase tracking-widest text-xs font-bold mb-1">Weekly Stardust</p>
                    <p className="text-sm text-white/50">
                      Earn stardust each week through tiered pack activity, or instantly through repeatable major actions.
                    </p>
                  </div>

                  {!stardustActive && (
                    <div className="mb-4 p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⏳</span>
                        <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">Feature unlocks in</span>
                      </div>
                      <div className="text-3xl md:text-4xl font-black font-mono tabular-nums text-indigo-400">
                        {formatCountdown(featureStartsAt - now)}
                      </div>
                      <p className="text-xs text-white/50 mt-1">
                        Starting January 1, 2027 (UTC), stardust becomes earnable through both methods below.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* LEFT: Weekly Pack Tiers */}
                    <div>
                      <div className="mb-3">
                        <p className="text-white/40 uppercase tracking-widest text-xs font-bold mb-1">Weekly Pack Tiers</p>
                        {stardustActive ? (
                          <p className="text-lg font-black text-white">
                            This week: <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">+{weekEarned.toLocaleString()}</span>
                            <span className="text-xs font-normal text-white/50 ml-2">✨ · resets Monday 00:00 UTC</span>
                          </p>
                        ) : (
                          <p className="text-xs text-white/40">One-time per week — cumulative toward a 660 ✨ weekly cap.</p>
                        )}
                      </div>

                      <div className="flex flex-col gap-3">
                        {STARDUST_TIERS.map((t) => {
                          const reached = stardustActive && currentStardustTier >= t.num;
                          const isNext = stardustActive && currentStardustTier === t.num - 1;
                          const reqParts: string[] = [];
                          if (t.reqPacks > 0) {
                            reqParts.push(isNext ? `${weekPacks} / ${t.reqPacks} packs` : `${t.reqPacks} packs`);
                          }
                          if (t.reqDrops > 0) {
                            reqParts.push(isNext ? `${weekDrops} / ${t.reqDrops} drop${t.reqDrops === 1 ? '' : 's'}` : `${t.reqDrops} drop${t.reqDrops === 1 ? '' : 's'}`);
                          }
                          if (t.reqPuzzles > 0) {
                            reqParts.push(isNext ? `${weekPuzzles} / ${t.reqPuzzles} puzzle${t.reqPuzzles === 1 ? '' : 's'}` : `${t.reqPuzzles} puzzle${t.reqPuzzles === 1 ? '' : 's'}`);
                          }

                          const ratios: number[] = [Math.min(weekPacks / t.reqPacks, 1)];
                          if (t.reqDrops > 0) ratios.push(Math.min(weekDrops / t.reqDrops, 1));
                          if (t.reqPuzzles > 0) ratios.push(Math.min(weekPuzzles / t.reqPuzzles, 1));
                          const progressPct = Math.min(...ratios) * 100;

                          if (reached) {
                            return (
                              <div key={t.num} className="relative flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold">✓</div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-green-400">Tier {t.num}</span>
                                    <span className="text-xs text-green-400/70">{t.desc}</span>
                                  </div>
                                </div>
                                <span className="text-sm font-black text-green-400">+{t.reward.toLocaleString()}/{STARDUST_WEEK_MAX} ✨</span>
                              </div>
                            );
                          }

                          if (isNext) {
                            return (
                              <div key={t.num} className="relative flex flex-col gap-2 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">{t.num}</div>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-bold text-indigo-400">Tier {t.num}</span>
                                      <span className="text-xs text-white/50">{reqParts.join(' · ')}</span>
                                    </div>
                                  </div>
                                  <span className="text-sm font-black text-indigo-400">+{t.reward.toLocaleString()}/{STARDUST_WEEK_MAX} ✨</span>
                                </div>
                                <div className="w-full bg-black/50 rounded-full h-2 mt-2">
                                  <div className="bg-indigo-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={t.num} className="relative flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl opacity-60">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white/40 text-sm">🔒</div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-white/60">Tier {t.num}</span>
                                  <span className="text-xs text-white/40">{t.desc}</span>
                                </div>
                              </div>
                              <span className="text-sm font-black text-white/40">+{t.reward.toLocaleString()}/{STARDUST_WEEK_MAX} ✨</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* RIGHT: Major Actions */}
                    <div>
                      <div className={`mb-3 ${stardustActive ? '' : 'opacity-60'}`}>
                        <p className="text-white/40 uppercase tracking-widest text-xs font-bold mb-1">Major Actions</p>
                        <p className="text-lg font-black text-white">
                          +{MAJOR_ACTION_STARDUST.toLocaleString()} <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">✨</span>
                          <span className="text-xs font-normal text-white/50 ml-2">per action</span>
                        </p>
                      </div>

                      <div className={`flex flex-col gap-3 ${stardustActive ? '' : 'opacity-50'}`}>
                        {MAJOR_ACTIONS.map((action) => {
                          const baseClass = 'relative flex items-center justify-between p-4 bg-purple-500/10 border border-purple-500/25 rounded-xl';
                          const inner = (
                            <>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-base shrink-0">
                                  {action.icon}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-sm font-bold text-white">{action.label}</span>
                                  <span className="text-xs text-white/40">{action.subtitle}</span>
                                  {action.href && (
                                    <span className="text-xs text-indigo-400 group-hover:text-indigo-300 underline underline-offset-2 mt-1">
                                      {action.hrefLabel} →
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-sm font-black text-purple-400 shrink-0 ml-2">+{MAJOR_ACTION_STARDUST.toLocaleString()} ✨</span>
                            </>
                          );

                          if (action.href) {
                            return (
                              <a
                                key={action.id}
                                href={action.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${baseClass} group ${stardustActive ? 'hover:border-purple-500/50 hover:bg-purple-500/15' : 'hover:opacity-100'} transition`}
                              >
                                {inner}
                              </a>
                            );
                          }
                          return (
                            <div key={action.id} className={baseClass}>
                              {inner}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0a0a14]/80 border border-white/10 rounded-3xl p-6">
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <p className="text-white/40 uppercase tracking-widest text-xs font-bold mb-1">Pack points streaks</p>
                      <p className="text-2xl font-black text-white">Total: <span className="text-green-400">+{data.stats?.streakTotal?.toLocaleString() || 0}</span> <span className="text-sm font-normal text-white/50">pp/day</span></p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                    {payoutSources.length ? payoutSources.map((source) => (
                      <div
                        key={source.id}
                        title={source.description}
                        className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-xl transition-colors hover:bg-white/[0.06] hover:border-white/10 cursor-help"
                      >
                        <div className="flex items-center gap-2"><span className="text-sm font-bold text-white/90">{source.label}</span></div>
                        <span className="text-sm font-black text-green-400">+{source.points.toLocaleString()} pp</span>
                      </div>
                    )) : <span className="text-white/30 italic text-sm col-span-2">No active payouts found.</span>}
                  </div>
                </div>

                <div className="bg-[#0a0a14]/80 border border-white/10 rounded-3xl p-6">
                  <div className="flex justify-between items-end mb-6">
                    <div>
                      <p className="text-white/40 uppercase tracking-widest text-xs font-bold mb-1">Streak Score</p>
                      <p className="text-2xl font-black text-white">Total: <span className="text-indigo-400">{streakScore.toLocaleString()}</span> <span className="text-sm font-normal text-white/50">score</span></p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 mt-4">
                    {Array.from({ length: tierCount }).map((_, i) => (
                      <div key={`tier-${i}`} className="relative flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold">✓</div>
                          <span className="text-sm font-bold text-green-400">Tier {i + 1} Lifetime Bonus</span>
                        </div>
                        <span className="text-sm font-black text-green-400">+100 pp / day</span>
                      </div>
                    ))}
                    <div className="relative flex flex-col gap-2 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">{tierCount + 1}</div>
                          <span className="text-sm font-bold text-indigo-400">Tier {tierCount + 1} Lifetime Bonus</span>
                        </div>
                        <span className="text-sm font-black text-indigo-400">{currentProgress.toLocaleString()} / 1,000</span>
                      </div>
                      <div className="w-full bg-black/50 rounded-full h-2 mt-2">
                        <div className="bg-indigo-500 h-2 rounded-full transition-all duration-500" style={{ width: `${(currentProgress / 1000) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BADGES TAB */}
          {activeTab === 'badges' && (
            <div className="flex flex-col gap-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {earnedBadges.map((badge) => (
                  <div key={`badge-tab-${badge.key}`} className="bg-[#0a0a14]/80 border border-white/10 rounded-3xl p-6 flex gap-4 items-center">
                    <div className="w-20 h-20 shrink-0 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
                      <CustomBadgeIcon badgeKey={badge.key} progress={badge.progress} defaultEmoteId={badge.defaultEmote} defaultFallback={badge.fallback} overrides={data.badgeOverrides} className="w-10 h-10" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">{data.badgeOverrides?.[badge.key]?.name || badge.label}</h3>
                      <p className="text-sm text-white/50">{badge.title}</p>
                      <p className="text-xs text-green-400 font-bold mt-2">Unlocked</p>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <button 
                  onClick={() => setShowLockedBadges(!showLockedBadges)}
                  className="flex items-center gap-2 text-sm font-bold text-white/50 hover:text-white transition mb-4"
                >
                  <span className={`transform transition-transform ${showLockedBadges ? 'rotate-90' : ''}`}>▶</span>
                  Not yet unlocked ({lockedBadges.length})
                </button>
                
                <AnimatePresence>
                  {showLockedBadges && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        {lockedBadges.map((badge) => (
                          <div key={`locked-${badge.key}`} className="bg-[#0a0a14]/40 border border-white/5 rounded-3xl p-6 flex gap-4 items-center opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
                            <div className="w-20 h-20 shrink-0 bg-black/50 border border-white/10 rounded-2xl flex items-center justify-center">
                              <CustomBadgeIcon badgeKey={badge.key} defaultEmoteId={badge.defaultEmote} defaultFallback={badge.fallback} overrides={data.badgeOverrides} className="w-10 h-10" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-white mb-1">{data.badgeOverrides?.[badge.key]?.name || badge.label}</h3>
                              <p className="text-sm text-white/50">{badge.title}</p>
                              <p className="text-xs text-white/30 font-bold mt-2">Locked</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* ACHIEVEMENTS TAB */}
          {activeTab === 'achievements' && (
            <div className="flex flex-col gap-8">
              
              {/* Unlocked Achievements */}
              <div>
                {unlockedAchievements.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {unlockedAchievements.map((ach) => {
                      const isFeatured = data.featuredBadgeId === ach.id;
                      const override = data.badgeOverrides?.[ach.id];
                      const highlightColor = getHighlightColor(ach);
                      return (
                        <div
                          key={ach.id}
                          className={`bg-[#0a0a14]/80 border rounded-3xl p-4 flex gap-4 items-center transition-all ${isFeatured ? '' : 'border-white/10'}`}
                          style={isFeatured ? { borderColor: highlightColor, boxShadow: `0 0 20px ${highlightColor}33` } : undefined}
                        >
                          <div
                            className="w-14 h-14 shrink-0 border rounded-2xl flex items-center justify-center shadow-inner"
                            style={{
                              background: `linear-gradient(135deg, ${highlightColor}33, ${highlightColor}1a)`,
                              borderColor: `${highlightColor}4d`,
                            }}
                          >
                            <CustomBadgeIcon badgeKey={ach.id} defaultEmoteId={null} defaultFallback="🏆" overrides={data.badgeOverrides} className="w-8 h-8" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-md font-bold text-white mb-1 break-words">{override?.name || ach.label}</h3>
                            <p className="text-xs font-bold" style={{ color: highlightColor }}>{ach.rarity} Collector</p>
                          </div>
                          {isOwnProfile && (
                            <button
                              onClick={() => handleSetFeaturedBadge(isFeatured ? null : ach.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${isFeatured ? 'bg-indigo-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                            >
                              {isFeatured ? 'Featured' : 'Feature'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-white/40 italic bg-white/[0.02] border border-white/5 rounded-3xl">
                    No achievements unlocked yet. Keep collecting to earn them!
                  </div>
                )}
              </div>

              {/* Locked Achievements */}
              <div>
                <button 
                  onClick={() => setShowLockedAchievements(!showLockedAchievements)}
                  className="flex items-center gap-2 text-sm font-bold text-white/50 hover:text-white transition mb-4"
                >
                  <span className={`transform transition-transform ${showLockedAchievements ? 'rotate-90' : ''}`}>▶</span>
                  Not yet unlocked ({lockedAchievements.length})
                </button>
                
                <AnimatePresence>
                  {showLockedAchievements && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="flex flex-col gap-3 pt-2">
                        {lockedAchievements.map((ach) => {
                          const override = data.badgeOverrides?.[ach.id];
                          const highlightColor = getHighlightColor(ach);
                          return (
                            <div key={`locked-ach-${ach.id}`} className="bg-[#0a0a14]/40 border border-white/5 rounded-3xl p-4 flex gap-4 items-center opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
                              <div
                                className="w-14 h-14 shrink-0 border rounded-2xl flex items-center justify-center"
                                style={{
                                  background: `linear-gradient(135deg, ${highlightColor}33, ${highlightColor}1a)`,
                                  borderColor: `${highlightColor}4d`,
                                }}
                              >
                                <CustomBadgeIcon badgeKey={ach.id} defaultEmoteId={null} defaultFallback="🏆" overrides={data.badgeOverrides} className="w-8 h-8" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-md font-bold text-white mb-1 break-words">{override?.name || ach.label}</h3>
                                <p className="text-xs font-bold mb-1" style={{ color: highlightColor }}>{ach.rarity} Collector</p>
                                <p className="text-xs text-white/30">Locked</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Modals (Edit Favorites, Card Viewer, Color Picker) */}
      <AnimatePresence>
        {isEditingFavorites && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-[#0a0a14] border border-white/10 rounded-3xl p-6 w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
              <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Edit Showcase</h2>
                  <p className="text-white/50 text-sm mt-1">Pick up to 8 commissions to display on your profile.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setIsEditingFavorites(false)} className="px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition">Cancel</button>
                  <button onClick={handleSaveFavorites} disabled={isSavingFavorites} className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition disabled:opacity-50">{isSavingFavorites ? 'Saving...' : `Save (${tempFavorites.size}/8)`}</button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 custom-scrollbar p-1">
                {allCards.length === 0 ? <p className="text-white/50 text-center py-10">Loading cards...</p> : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {allCards.map(card => {
                      const isSelected = tempFavorites.has(card.name);
                      return (
                        <div key={card.name} className={`relative aspect-[0.718] rounded-xl overflow-hidden cursor-pointer transition-all ${isSelected ? 'ring-4 ring-indigo-500 scale-[0.98]' : 'hover:scale-[1.02] opacity-70 hover:opacity-100'}`} onClick={() => toggleFavorite(card.name)}>
                          <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
                          {isSelected && <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center"><div className="w-10 h-10 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xl shadow-lg border-2 border-white">✓</div></div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedCard && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setSelectedCard(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center overflow-hidden" onClick={e => e.stopPropagation()}>
              <img src={selectedCard.image} alt={selectedCard.name} className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isColorModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-[#0a0a14] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4">Choose Name Color</h3>
              <p className="text-sm text-white/50 mb-6">This will create a cosmetic role in the Discord server to match your color.</p>
              <div className="flex justify-center mb-6">
                <input type="color" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} className="w-24 h-24 rounded cursor-pointer bg-transparent border-0 p-0" />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setIsColorModalOpen(false)} className="px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition">Cancel</button>
                <button onClick={handleSaveColor} disabled={savingColor} className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-medium transition disabled:opacity-50">{savingColor ? 'Saving...' : 'Save Color'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
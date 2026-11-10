'use client';

import { useEffect, useState } from 'react';
import { useCollectionFilter } from '@/components/CollectionFilterContext';
import { motion, AnimatePresence } from 'motion/react';
import StandardCard from '@/components/StandardCard';
import { DEFAULT_MILESTONES, type Milestone } from '@/lib/loyalty-milestones';

type ProfileData = {
  id: string;
  name: string;
  avatarUrl: string;
  isOnline: boolean;
  customColor: string | null;
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
  // NEW: Add these to your /api/profiles/[userId] route
  stats?: {
    stardust: number;
    collectorPoints: number;
    packPoints: number;
    streakSources: string[];
  };
  inventory?: Record<string, number>; // "Card Name|Rarity": Count
};

type CardData = {
  name: string;
  type: string;
  image: string;
  thumbUrl?: string;
  glow?: string;
  rarity?: string;
  description?: string;
  details?: string;
  link?: string;
  collection?: string;
  related?: string[];
  contraband?: boolean;
  contrabandArtist?: string;
};

function formatSubTime(months: number) {
  if (months < 12) return `${months} Month${months === 1 ? '' : 's'}`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `${years} Year${years === 1 ? '' : 's'}`;
  return `${years} Year${years === 1 ? '' : 's'}, ${rem} Month${rem === 1 ? '' : 's'}`;
}

function BadgeIcon({ emoteId, fallbackText }: { emoteId: string | null, fallbackText: string }) {
  if (!emoteId) return <span className="text-white/50 text-sm font-bold">{fallbackText}</span>;
  return <img src={`https://cdn.discordapp.com/emojis/${emoteId}.png`} alt={fallbackText} className="w-8 h-8 object-contain" />;
}

// Helper to get the next upgrade for a specific badge type
function getNextUpgrade(type: 'sub' | 'referral' | 'gift', currentValue: number): Milestone | null {
  const milestones = DEFAULT_MILESTONES.filter(m => m.type === type).sort((a, b) => a.threshold - b.threshold);
  return milestones.find(m => m.threshold > currentValue) || null;
}

export default function ProfileClient({ userId }: { userId: string }) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [allCards, setAllCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'commissions' | 'points' | 'badges'>('commissions');
  
  // Edit state
  const { userId: currentUserId, roles } = useCollectionFilter();
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [savingColor, setSavingColor] = useState(false);

  const isOwnProfile = currentUserId === userId;
  const canEdit = isOwnProfile && roles?.darsubscribbler;

  const fetchProfile = async () => {
    try {
      const [profileRes, cardsRes] = await Promise.all([
        fetch(`/api/profiles/${userId}`, { cache: 'no-store' }),
        fetch(`/api/cards/list`, { cache: 'no-store' }) // Fetch global cards to render commissions
      ]);

      if (profileRes.ok) {
        const json = await profileRes.json();
        setData(json);
        if (json.customColor) setSelectedColor(json.customColor);
      }
      if (cardsRes.ok) {
        setAllCards(await cardsRes.json());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    const int = setInterval(fetchProfile, 30000);
    return () => clearInterval(int);
  }, [userId]);

  const handleSaveColor = async () => {
    setSavingColor(true);
    try {
      const res = await fetch('/api/profiles/color', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colorHex: selectedColor }),
      });
      if (res.ok) {
        setIsColorModalOpen(false);
        fetchProfile();
      } else {
        const errData = await res.json();
        alert(`Failed to save color: ${errData.error || 'Unknown error'}`);
      }
    } finally {
      setSavingColor(false);
    }
  };

  if (loading) return <div className="text-white/50 text-center animate-pulse mt-20">Loading profile...</div>;
  if (!data) return <div className="text-red-400 text-center mt-20">User not found.</div>;

  // Parse inventory to find commissioned cards
  const commissionedCards: CardData[] = [];
  if (data.inventory) {
    const ownedCardNames = new Set(Object.keys(data.inventory).map(k => k.split('|')[0].toLowerCase()));
    for (const card of allCards) {
      if (ownedCardNames.has(card.name.toLowerCase()) && !card.contraband) {
        commissionedCards.push(card);
      }
    }
  }

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* ─── TOP SECTION (Profile Header) ─── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0a0a14]/80 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-indigo-500/10 blur-[100px] pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="relative">
            <img src={data.avatarUrl} alt={data.name} className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white/10 shadow-lg object-cover bg-black/50" />
            {data.isOnline && (
              <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-[#0a0a14] rounded-full shadow-lg" title="Online on Website" />
            )}
          </div>

          <div className="flex flex-col items-center md:items-start flex-1">
            <div className="flex items-center gap-3 mb-2">
              {data.customColor ? (
                <h1 className="text-3xl md:text-5xl font-black" style={{ color: data.customColor }}>
                  {data.name}
                </h1>
              ) : (
                <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
                  {data.name}
                </h1>
              )}

              {canEdit && (
                <button 
                  onClick={() => setIsColorModalOpen(true)}
                  className="text-white/30 hover:text-white/80 transition-colors p-2"
                  title="Edit Name Color"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                  </svg>
                </button>
              )}
            </div>
            
            <p className="text-white/50 mb-6">ID: {data.id}</p>
          </div>
        </div>
      </motion.div>

      {/* ─── TABS NAVIGATION ─── */}
      <div className="flex justify-center w-full">
        <div className="flex bg-[#0a0a14]/80 border border-white/10 rounded-full p-1 backdrop-blur-xl">
          {(['commissions', 'points', 'badges'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-full text-sm font-bold capitalize transition-all ${
                activeTab === tab 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ─── TAB CONTENT ─── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="w-full"
        >
          {/* COMMISSIONS TAB */}
          {activeTab === 'commissions' && (
            <div>
              {commissionedCards.length === 0 ? (
                <div className="text-center py-20 text-white/40 italic bg-white/[0.02] border border-white/5 rounded-3xl">
                  No commissions found in this collection.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {commissionedCards.map((card) => (
                    <div key={card.name} className="w-full">
                      <StandardCard
                        name={card.name}
                        title={card.type}
                        type={card.type}
                        image={card.image}
                        thumbUrl={card.thumbUrl}
                        rarity={card.rarity}
                        glow={card.glow}
                        isPlay={true} // Forces rarity to show
                        enableTilt={true} // Animations enabled
                        onClick={() => {}} // Could open a modal if desired
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* POINTS TAB */}
          {activeTab === 'points' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Stardust */}
              <div className="bg-[#0a0a14]/80 border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
                <p className="text-white/40 uppercase tracking-widest text-xs font-bold mb-2">Stardust</p>
                <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                  {data.stats?.stardust?.toLocaleString() || '0'}
                </p>
              </div>

              {/* Collector Points */}
              <div className="bg-[#0a0a14]/80 border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
                <p className="text-white/40 uppercase tracking-widest text-xs font-bold mb-2">Collector Points</p>
                <p className="text-4xl font-black text-white">
                  {data.stats?.collectorPoints?.toLocaleString() || '0'}
                </p>
              </div>

              {/* Pack Points */}
              <div className="bg-[#0a0a14]/80 border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
                <p className="text-white/40 uppercase tracking-widest text-xs font-bold mb-2">Pack Points</p>
                <p className="text-4xl font-black text-white">
                  {data.stats?.packPoints?.toLocaleString() || '0'}
                </p>
              </div>

              {/* Streak Sources */}
              <div className="bg-[#0a0a14]/80 border border-white/10 rounded-3xl p-6 col-span-1 md:col-span-2 lg:col-span-3">
                <p className="text-white/40 uppercase tracking-widest text-xs font-bold mb-4">/streak Sources</p>
                <div className="flex flex-wrap gap-2">
                  {data.stats?.streakSources?.length ? data.stats.streakSources.map((src, i) => (
                    <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-white/80">
                      {src}
                    </span>
                  )) : (
                    <span className="text-white/30 italic text-sm">No streak sources found.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* BADGES TAB */}
          {activeTab === 'badges' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Subscriber Badge */}
              <div className="bg-[#0a0a14]/80 border border-white/10 rounded-3xl p-6 flex gap-4 items-center">
                <div className="w-20 h-20 shrink-0 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
                  <BadgeIcon emoteId={data.emotes.heart} fallbackText="💖" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">Subscriber</h3>
                  <p className="text-sm text-white/50 mb-3">
                    {data.badges.subMonths > 0 ? `Currently ${formatSubTime(data.badges.subMonths)}` : 'Not subscribed'}
                  </p>
                  
                  {(() => {
                    const next = getNextUpgrade('sub', data.badges.subMonths);
                    if (!next) return <p className="text-xs text-green-400 font-bold">Max tier reached!</p>;
                    return (
                      <div className="w-full bg-black/50 rounded-full h-2 mt-2">
                        <div 
                          className="bg-indigo-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (data.badges.subMonths / next.threshold) * 100)}%` }}
                        />
                        <p className="text-xs text-white/40 mt-2">Next: {next.label}</p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Referral Badge */}
              <div className="bg-[#0a0a14]/80 border border-white/10 rounded-3xl p-6 flex gap-4 items-center">
                <div className="w-20 h-20 shrink-0 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
                  <BadgeIcon emoteId={data.emotes.banana} fallbackText="🍌" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">Referrals</h3>
                  <p className="text-sm text-white/50 mb-3">{data.badges.referrals} Referred</p>
                  
                  {(() => {
                    const next = getNextUpgrade('referral', data.badges.referrals);
                    if (!next) return <p className="text-xs text-green-400 font-bold">Max tier reached!</p>;
                    return (
                      <div className="w-full bg-black/50 rounded-full h-2 mt-2">
                        <div 
                          className="bg-indigo-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (data.badges.referrals / next.threshold) * 100)}%` }}
                        />
                        <p className="text-xs text-white/40 mt-2">Next: {next.label}</p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Gift Badge */}
              <div className="bg-[#0a0a14]/80 border border-white/10 rounded-3xl p-6 flex gap-4 items-center">
                <div className="w-20 h-20 shrink-0 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
                  <BadgeIcon emoteId={data.emotes.gift} fallbackText="🎁" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">Gifter</h3>
                  <p className="text-sm text-white/50 mb-3">{data.badges.gifts} Gifts Sent</p>
                  
                  {(() => {
                    const next = getNextUpgrade('gift', data.badges.gifts);
                    if (!next) return <p className="text-xs text-green-400 font-bold">Max tier reached!</p>;
                    return (
                      <div className="w-full bg-black/50 rounded-full h-2 mt-2">
                        <div 
                          className="bg-indigo-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (data.badges.gifts / next.threshold) * 100)}%` }}
                        />
                        <p className="text-xs text-white/40 mt-2">Next: {next.label}</p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Commissioner Badge */}
              {data.badges.isCommissioner && (
                <div className="bg-[#0a0a14]/80 border border-white/10 rounded-3xl p-6 flex gap-4 items-center">
                  <div className="w-20 h-20 shrink-0 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
                    <BadgeIcon emoteId={data.emotes.sparkle} fallbackText="✨" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">Commissioner</h3>
                    <p className="text-sm text-white/50">Patron of the arts</p>
                    <p className="text-xs text-green-400 font-bold mt-2">Unlocked</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Color Picker Modal */}
      <AnimatePresence>
        {isColorModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-[#0a0a14] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-4">Choose Name Color</h3>
              <p className="text-sm text-white/50 mb-6">This will create a cosmetic role in the Discord server to match your color.</p>
              
              <div className="flex justify-center mb-6">
                <input 
                  type="color" 
                  value={selectedColor} 
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-24 h-24 rounded cursor-pointer bg-transparent border-0 p-0"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button onClick={() => setIsColorModalOpen(false)} className="px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition">
                  Cancel
                </button>
                <button onClick={handleSaveColor} disabled={savingColor} className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-medium transition disabled:opacity-50">
                  {savingColor ? 'Saving...' : 'Save Color'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

type ProfileData = {
  id: string;
  name: string;
  avatarUrl: string;
  isOnline: boolean;
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
  return (
    <img 
      src={`https://cdn.discordapp.com/emojis/${emoteId}.png`} 
      alt={fallbackText} 
      className="w-8 h-8 object-contain" 
    />
  );
}

export default function ProfileClient({ userId }: { userId: string }) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/profiles/${userId}`, { cache: 'no-store' });
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
    
    const int = setInterval(fetchProfile, 30000);
    return () => clearInterval(int);
  }, [userId]);

  if (loading) return <div className="text-white/50 text-center animate-pulse">Loading profile...</div>;
  if (!data) return <div className="text-red-400 text-center">User not found.</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0a0a14]/80 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden"
    >
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-indigo-500/10 blur-[100px] pointer-events-none" />

      <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
        {/* Avatar & Status */}
        <div className="relative">
          <img 
            src={data.avatarUrl} 
            alt={data.name} 
            className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white/10 shadow-lg object-cover bg-black/50"
          />
          {data.isOnline && (
            <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-[#0a0a14] rounded-full shadow-lg" title="Online on Website" />
          )}
        </div>

        {/* User Info */}
        <div className="flex flex-col items-center md:items-start flex-1">
          <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 mb-6">
            {data.name}
          </h1>

          {/* Badges Row */}
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            
            {/* Subscriber Badge */}
            {data.badges.subMonths > 0 && (
              <div className="group relative flex flex-col items-center justify-center w-16 h-16 bg-white/5 border border-white/10 rounded-2xl cursor-help hover:bg-white/10 transition-colors">
                <BadgeIcon emoteId={data.emotes.heart} fallbackText="💖" />
                <span className="absolute -bottom-10 bg-black text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10 z-50">
                  Subscribed: {formatSubTime(data.badges.subMonths)}
                </span>
              </div>
            )}

            {/* Commissioner Badge */}
            {data.badges.isCommissioner && (
              <div className="group relative flex flex-col items-center justify-center w-16 h-16 bg-white/5 border border-white/10 rounded-2xl cursor-help hover:bg-white/10 transition-colors">
                <BadgeIcon emoteId={data.emotes.sparkle} fallbackText="✨" />
                <span className="absolute -bottom-10 bg-black text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10 z-50">
                  Commissioner
                </span>
              </div>
            )}

            {/* Gifts Badge */}
            {data.badges.gifts > 0 && (
              <div className="group relative flex flex-col items-center justify-center w-16 h-16 bg-white/5 border border-white/10 rounded-2xl cursor-help hover:bg-white/10 transition-colors">
                <BadgeIcon emoteId={data.emotes.gift} fallbackText="🎁" />
                <span className="absolute -bottom-10 bg-black text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10 z-50">
                  {data.badges.gifts} Gift{data.badges.gifts === 1 ? '' : 's'} Sent
                </span>
              </div>
            )}

            {/* Referrals Badge */}
            {data.badges.referrals > 0 && (
              <div className="group relative flex flex-col items-center justify-center w-16 h-16 bg-white/5 border border-white/10 rounded-2xl cursor-help hover:bg-white/10 transition-colors">
                <BadgeIcon emoteId={data.emotes.banana} fallbackText="🍌" />
                <span className="absolute -bottom-10 bg-black text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10 z-50">
                  {data.badges.referrals} Referral{data.badges.referrals === 1 ? '' : 's'}
                </span>
              </div>
            )}

            {/* Loyalty Badges */}
            {data.badges.loyalty.map(year => (
              <div key={year} className="group relative flex flex-col items-center justify-center w-16 h-16 bg-white/5 border border-white/10 rounded-2xl cursor-help hover:bg-white/10 transition-colors">
                <BadgeIcon emoteId={data.emotes.love} fallbackText="💜" />
                <span className="absolute -bottom-10 bg-black text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10 z-50">
                  {year} Loyalty Card
                </span>
              </div>
            ))}

          </div>
        </div>
      </div>
    </motion.div>
  );
}
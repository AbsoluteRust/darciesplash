'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import ProfileCard from '@/components/ProfileCard';

type MiniPack = {
  id: string;
  cards: { name: string; rarity: string; collection: string; image?: string }[];
};

export default function MiniPackReveal({ onBack }: { onBack: () => void }) {
  const [packs, setPacks] = useState<MiniPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [revealedCards, setRevealedCards] = useState<any[] | null>(null);

  const fetchPacks = async () => {
    try {
      const res = await fetch('/api/minipacks');
      if (res.ok) {
        const data = await res.json();
        setPacks(data.packs || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPacks();
  }, []);

  const handleOpen = async (packId: string) => {
    setOpeningId(packId);
    try {
      const res = await fetch('/api/minipacks/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (res.ok) {
        const cardsRes = await fetch('/api/cards/list');
        const allCards = cardsRes.ok ? await cardsRes.json() : [];
        
        const fullCards = data.cards.map((c: any) => {
          const meta = allCards.find((ac: any) => ac.name === c.name);
          return { ...c, image: meta?.image, thumbUrl: meta?.thumbUrl, type: meta?.type };
        });

        setRevealedCards(fullCards);
        setPacks(prev => prev.filter(p => p.id !== packId));
      } else {
        alert(data.error);
      }
    } finally {
      setOpeningId(null);
    }
  };

  if (loading) return <div className="text-white/50 animate-pulse">Loading Mini Packs...</div>;

  if (revealedCards) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full pb-10">
        <h2 className="text-2xl font-bold text-white mb-6">Mini Pack Opened!</h2>
        <div className="flex gap-4 flex-wrap justify-center">
          {revealedCards.map((card, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 50, rotateY: 180 }}
              animate={{ opacity: 1, y: 0, rotateY: 0 }}
              transition={{ delay: i * 0.3, duration: 0.5 }}
              className="w-[140px] sm:w-[160px]"
            >
              <ProfileCard
                name={card.name}
                title={card.type || 'Emote'}
                handle={card.name.toLowerCase().replace(/\s+/g, '-')}
                status="Online"
                contactText="View"
                avatarUrl={card.thumbUrl || card.image}
                rarity={card.rarity}
                showUserInfo={false}
                enableTilt={true}
                behindGlowColor="#fff"
                iconUrl={null}
                behindGlowEnabled
                innerGradient="linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)"
                isModal={true}
              />
            </motion.div>
          ))}
        </div>
        <button 
          onClick={() => {
            setRevealedCards(null);
            if (packs.length === 0) onBack();
          }}
          className="mt-8 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition"
        >
          {packs.length === 0 ? 'Done' : 'Open Next Pack'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex justify-between items-center w-full max-w-lg mb-6">
        <h2 className="text-2xl font-bold text-white">Your Mini Packs</h2>
        <button onClick={onBack} className="text-sm text-white/50 hover:text-white transition">Cancel</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-lg">
        {packs.map(pack => (
          <button
            key={pack.id}
            onClick={() => handleOpen(pack.id)}
            disabled={openingId === pack.id}
            className="group relative flex flex-col items-center justify-center aspect-square bg-[#0a0a14] border border-white/10 rounded-2xl hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all disabled:opacity-50"
          >
            <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">🎁</span>
            <span className="text-sm font-bold text-white">Open</span>
            {openingId === pack.id && (
              <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
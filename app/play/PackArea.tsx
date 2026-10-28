'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import PlayButton from './PlayButton';
import MiniPackReveal from './MiniPackReveal';

type MiniPack = {
  id: string;
  cards: { name: string; rarity: string; collection: string; image?: string }[];
};

export default function PackArea({ groupActive, groupTimeLeft }: { groupActive?: boolean; groupTimeLeft?: number }) {
  const [packs, setPacks] = useState<MiniPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<'regular' | 'minipack'>('regular');
  
  const [revealedCards, setRevealedCards] = useState<any[] | null>(null);
  const [opening, setOpening] = useState(false);
  
  // Hold State
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);

  const fetchPacks = async () => {
    try {
      const res = await fetch('/api/minipacks');
      if (res.ok) {
        const data = await res.json();
        const hasPacks = data.packs && data.packs.length > 0;
        setPacks(data.packs || []);
        if (!hasPacks) setSelected('regular');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPacks();
  }, []);

  // Handle Group Hold Automation
  useEffect(() => {
    if (groupActive && groupTimeLeft !== undefined) {
      if (groupTimeLeft <= 2 && groupTimeLeft > 0) {
        setIsHolding(true);
      } else {
        setIsHolding(false);
      }
    } else {
      setIsHolding(false);
    }
  }, [groupActive, groupTimeLeft]);

  // Handle Hold Timer (For manual mini-pack opening)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isHolding && !groupActive && selected === 'minipack') {
      interval = setInterval(() => {
        setProgress((p) => {
          if (p >= 1) {
            clearInterval(interval);
            handleOpenMinipack();
            return 0;
          }
          return p + 0.05;
        });
      }, 50);
    } else if (groupActive && isHolding) {
      // For group, just animate the progress bar filling up over 2 seconds
      interval = setInterval(() => {
        setProgress((p) => {
          if (p >= 1) {
            clearInterval(interval);
            return 1; // Hold at 100% until server resolves
          }
          return p + 0.05;
        });
      }, 50);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [isHolding, selected, groupActive]);

  const handleOpenMinipack = async () => {
    if (packs.length === 0 || opening) return;
    setIsHolding(false);
    setOpening(true);

    const packId = packs[0]?.id;
    if (!packId) {
      setOpening(false);
      return;
    }

    try {
      const res = await fetch('/api/minipacks/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      
      if (res.ok && Array.isArray(data.cards)) {
        setRevealedCards(data.cards.filter(Boolean));
        setPacks(prev => prev.slice(1));
      } else if (res.ok) {
        alert('Pack opened, but no cards were returned.');
        setPacks(prev => prev.slice(1));
      } else {
        alert(data.error || 'Failed to open pack');
      }
    } catch (err) {
      console.error(err);
      alert('A network error occurred while opening the pack.');
    } finally {
      setOpening(false);
    }
  };

  const handleDone = () => {
    setRevealedCards(null);
    if (packs.length === 0) setSelected('regular');
    fetchPacks();
  };

  if (loading) return <div className="text-white/50 animate-pulse">Loading...</div>;

  if (revealedCards) {
    return <MiniPackReveal cards={revealedCards} onDone={handleDone} />;
  }

  // If no minipacks, default to the original PlayButton
  if (packs.length === 0) {
    return (
      <motion.div
        animate={groupActive && isHolding ? {
          x: [0, -3, 3, -3, 3, 0],
          y: [0, 2, -2, 2, -2, 0],
          rotate: [0, -1, 1, -1, 1, 0]
        } : {}}
        transition={{ repeat: groupActive && isHolding ? Infinity : 0, duration: 0.15 }}
        className={`relative ${groupActive ? 'pointer-events-none' : ''}`}
      >
        <PlayButton />
        {groupActive && (
          <div 
            className="absolute bottom-0 left-0 h-1.5 bg-indigo-500 transition-opacity duration-150"
            style={{ width: `${progress * 100}%`, opacity: progress > 0 ? 1 : 0 }}
          />
        )}
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-6 sm:gap-12 w-full justify-center items-center h-full pb-10">
      
      {/* Regular Pack */}
      <motion.div
        onClick={() => !groupActive && setSelected('regular')}
        animate={groupActive && isHolding ? {
          x: [0, -3, 3, -3, 3, 0],
          y: [0, 2, -2, 2, -2, 0],
          rotate: [0, -1, 1, -1, 1, 0]
        } : {}}
        transition={{ repeat: groupActive && isHolding ? Infinity : 0, duration: 0.15 }}
        className={`
          transition-all duration-300 flex items-center justify-center relative
          ${groupActive ? 'pointer-events-none' : 'cursor-pointer'}
          ${selected === 'regular' ? 'scale-100' : 'scale-90 opacity-30 grayscale pointer-events-none'}
        `}
      >
        <PlayButton />
        {groupActive && (
          <div 
            className="absolute bottom-0 left-0 h-1.5 bg-indigo-500 transition-opacity duration-150"
            style={{ width: `${progress * 100}%`, opacity: progress > 0 ? 1 : 0 }}
          />
        )}
      </motion.div>

      {/* Mini Pack Card */}
      <motion.div
        onPointerDown={(e) => {
          e.preventDefault();
          if (groupActive) return;
          if (!opening) {
            if (selected !== 'minipack') setSelected('minipack');
            else setIsHolding(true);
          }
        }}
        onPointerUp={() => !groupActive && setIsHolding(false)}
        onPointerLeave={() => !groupActive && setIsHolding(false)}
        onPointerCancel={() => !groupActive && setIsHolding(false)}
        animate={
          isHolding && selected === 'minipack' && !groupActive ? {
            x: [0, -3, 3, -3, 3, 0],
            y: [0, 2, -2, 2, -2, 0],
            rotate: [0, -1, 1, -1, 1, 0]
          } : {}
        }
        transition={{
          repeat: isHolding && selected === 'minipack' && !groupActive ? Infinity : 0,
          duration: 0.15
        }}
        className={`
          relative flex flex-col items-center justify-center w-[180px] h-[260px] 
          rounded-3xl overflow-hidden select-none touch-none border transition-all duration-300
          ${selected === 'minipack' 
            ? 'bg-indigo-500/10 border-indigo-500/50 scale-100 shadow-[0_0_30px_rgba(99,102,241,0.2)] cursor-pointer' 
            : 'bg-[#0a0a14] border-white/10 scale-90 opacity-30 grayscale cursor-pointer hover:opacity-70 hover:scale-95'
          }
          ${opening ? 'opacity-50 cursor-wait' : ''}
          ${groupActive ? 'opacity-30 grayscale pointer-events-none' : ''}
        `}
      >
        <span className={`text-5xl mb-4 transition-transform duration-300 ${selected === 'minipack' ? 'scale-110' : 'scale-100'}`}>
          🎁
        </span>
        <span className={`font-bold text-lg text-center px-4 leading-tight ${selected === 'minipack' ? 'text-white' : 'text-white/70'}`}>
          Mini Pack
        </span>
        <span className={`text-xs text-center mt-2 ${selected === 'minipack' ? 'text-indigo-300' : 'text-white/30'}`}>
          {opening ? 'Opening...' : groupActive ? 'Group active' : 'Hold to open'}
        </span>

        <div 
          className="absolute bottom-0 left-0 h-1.5 bg-indigo-500 transition-opacity duration-150"
          style={{ width: `${progress * 100}%`, opacity: progress > 0 ? 1 : 0 }}
        />
      </motion.div>

    </div>
  );
}
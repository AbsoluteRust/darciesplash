'use client';

import { useEffect, useState } from 'react';
import PlayButton from './PlayButton';
import MiniPackReveal from './MiniPackReveal';

export default function PackArea() {
  const [hasMinipacks, setHasMinipacks] = useState(false);
  const [view, setView] = useState<'select' | 'minipack'>('select');
  const [selected, setSelected] = useState<'regular' | 'minipack'>('regular');

  // Check for minipacks whenever we return to the select view
  useEffect(() => {
    if (view !== 'select') return;
    
    fetch('/api/minipacks')
      .then(res => res.json())
      .then(data => {
        const hasPacks = data.packs && data.packs.length > 0;
        setHasMinipacks(hasPacks);
        if (!hasPacks) setSelected('regular');
      })
      .catch(console.error);
  }, [view]);

  if (view === 'minipack') {
    return <MiniPackReveal onBack={() => setView('select')} />;
  }

  // If no minipacks, revert to the original UI
  if (!hasMinipacks) {
    return <PlayButton />;
  }

  return (
    <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 w-full justify-center items-center h-full pb-10">
      
      {/* Regular Pack (Wrapped to handle focus/grayscale) */}
      <div
        onClick={() => setSelected('regular')}
        className={`
          transition-all duration-300 flex items-center justify-center cursor-pointer
          ${selected === 'regular' ? 'scale-100' : 'scale-90 opacity-40 grayscale'}
        `}
      >
        <PlayButton />
      </div>

      {/* Mini Pack Card */}
      <MiniPackCard
        active={selected === 'minipack'}
        onSelect={() => setSelected('minipack')}
        onOpen={() => setView('minipack')}
      />

    </div>
  );
}

function MiniPackCard({ active, onSelect, onOpen }: { active: boolean; onSelect: () => void; onOpen: () => void }) {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isHolding && active) {
      interval = setInterval(() => {
        setProgress((p) => {
          if (p >= 1) {
            clearInterval(interval);
            onOpen();
            return 0;
          }
          return p + 0.05; // 1 second total (50ms * 20)
        });
      }, 50);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [isHolding, active, onOpen]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!active) {
      onSelect(); // First tap just selects it
    } else {
      setIsHolding(true); // Second tap+hold starts opening
    }
  };

  const handlePointerUp = () => setIsHolding(false);

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={`
        relative flex flex-col items-center justify-center w-[180px] h-[260px] 
        rounded-3xl overflow-hidden select-none touch-none border transition-all duration-300
        ${active 
          ? 'bg-indigo-500/10 border-indigo-500/50 scale-100 shadow-[0_0_30px_rgba(99,102,241,0.2)] cursor-pointer' 
          : 'bg-[#0a0a14] border-white/10 scale-90 opacity-40 grayscale cursor-pointer hover:opacity-70 hover:scale-95'
        }
      `}
    >
      <span className={`text-5xl mb-4 transition-transform duration-300 ${active ? 'scale-110' : 'scale-100'}`}>
        🎁
      </span>
      <span className={`font-bold text-lg text-center px-4 leading-tight ${active ? 'text-white' : 'text-white/70'}`}>
        Mini Pack
      </span>
      <span className={`text-xs text-center mt-2 ${active ? 'text-indigo-300' : 'text-white/30'}`}>
        Hold to open
      </span>

      {/* Progress Bar */}
      <div 
        className="absolute bottom-0 left-0 h-1.5 bg-indigo-500 transition-opacity duration-150"
        style={{ 
          width: `${progress * 100}%`,
          opacity: progress > 0 ? 1 : 0 
        }}
      />
    </div>
  );
}
'use client';

import { useEffect, useState, useRef } from 'react';
import PlayButton from './PlayButton';
import MiniPackReveal from './MiniPackReveal';

type HoldCardProps = {
  title: string;
  subtitle: string;
  icon: string;
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
  onOpen: () => void;
  isMiniPack: boolean;
};

function HoldCard({ title, subtitle, icon, active, disabled, onSelect, onOpen, isMiniPack }: HoldCardProps) {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startHold = () => {
    if (disabled) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    // If it's not the active card, select it first
    if (!active) {
      onSelect();
    }

    // Start the 1-second hold timer
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onOpen();
          return 0; // Reset after opening
        }
        return p + 0.05; // Increments by 5% every 50ms (1 second total)
      });
    }, 50);
  };

  const cancelHold = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setProgress(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      className={`
        relative flex flex-col items-center justify-center w-[160px] sm:w-[200px] h-[240px] sm:h-[280px] 
        rounded-3xl overflow-hidden select-none touch-none
        transition-all duration-300 border
        ${disabled 
          ? 'bg-white/5 border-white/5 opacity-30 cursor-not-allowed' 
          : active
            ? 'bg-indigo-500/10 border-indigo-500/50 scale-100 shadow-[0_0_30px_rgba(99,102,241,0.2)] cursor-pointer'
            : 'bg-[#0a0a14] border-white/10 scale-90 opacity-40 grayscale cursor-pointer hover:opacity-70 hover:scale-95'
        }
      `}
    >
      <span className={`text-5xl mb-4 transition-transform duration-300 ${active ? 'scale-110' : 'scale-100'}`}>
        {icon}
      </span>
      <span className={`font-bold text-lg text-center px-4 leading-tight ${active ? 'text-white' : 'text-white/70'}`}>
        {title}
      </span>
      <span className={`text-xs text-center mt-2 ${active ? (isMiniPack ? 'text-indigo-300' : 'text-white/50') : 'text-white/30'}`}>
        {subtitle}
      </span>

      {/* Progress Bar (Only visible when holding) */}
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

export default function PackArea() {
  const [hasMinipacks, setHasMinipacks] = useState(false);
  const [view, setView] = useState<'select' | 'regular' | 'minipack'>('select');
  const [selected, setSelected] = useState<'regular' | 'minipack'>('regular');

  const checkMinipacks = async () => {
    try {
      const res = await fetch('/api/minipacks');
      if (res.ok) {
        const data = await res.json();
        const hasPacks = data.packs && data.packs.length > 0;
        setHasMinipacks(hasPacks);
        if (!hasPacks) setSelected('regular'); // fallback to regular if none left
      }
    } catch {}
  };

  useEffect(() => {
    checkMinipacks();
  }, []);

  // When returning from an open sequence, re-verify we still have minipacks
  const handleBack = async () => {
    await checkMinipacks();
    setView('select');
  };

  if (view === 'regular') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <PlayButton />
        <button onClick={handleBack} className="mt-6 text-sm text-white/50 hover:text-white transition-colors">
          ← Back to options
        </button>
      </div>
    );
  }

  if (view === 'minipack') {
    return <MiniPackReveal onBack={handleBack} />;
  }

  return (
    <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 w-full justify-center items-center h-full pb-10">
      
      <HoldCard
        title="Regular Pack"
        subtitle="10,000 pts"
        icon="🎴"
        active={selected === 'regular'}
        disabled={false}
        onSelect={() => setSelected('regular')}
        onOpen={() => setView('regular')}
        isMiniPack={false}
      />

      <HoldCard
        title="Mini Pack"
        subtitle={hasMinipacks ? "Unopened available" : "None available"}
        icon="🎁"
        active={selected === 'minipack'}
        disabled={!hasMinipacks}
        onSelect={() => setSelected('minipack')}
        onOpen={() => setView('minipack')}
        isMiniPack={true}
      />

    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import PlayButton from './PlayButton';
import MiniPackReveal from './MiniPackReveal';

export default function PackArea() {
  const [hasMinipacks, setHasMinipacks] = useState(false);
  const [view, setView] = useState<'select' | 'regular' | 'minipack'>('select');

  useEffect(() => {
    fetch('/api/minipacks')
      .then(res => res.json())
      .then(data => {
        if (data.packs && data.packs.length > 0) setHasMinipacks(true);
      })
      .catch(console.error);
  }, []);

  // If they have no minipacks, just show the regular PlayButton directly.
  if (!hasMinipacks && view !== 'minipack') {
    return <PlayButton />;
  }

  if (view === 'minipack') {
    return <MiniPackReveal onBack={() => setView('select')} />;
  }

  if (view === 'regular') {
    return (
      <div className="w-full h-full flex flex-col items-center">
         <button onClick={() => setView('select')} className="mb-4 text-sm text-white/50 hover:text-white self-start transition">← Back to options</button>
         <PlayButton />
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 w-full justify-center items-center">
      <button 
        onClick={() => setView('regular')} 
        className="flex flex-col items-center justify-center w-40 h-48 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 hover:scale-105 transition-all"
      >
         <span className="text-4xl mb-3">🎴</span>
         <span className="font-bold text-white mb-1">Regular Pack</span>
         <span className="text-white/50 text-xs">10,000 pts</span>
      </button>

      <button 
        onClick={() => setView('minipack')} 
        className="flex flex-col items-center justify-center w-40 h-48 bg-indigo-500/10 border border-indigo-500/30 rounded-3xl hover:bg-indigo-500/20 hover:scale-105 transition-all shadow-[0_0_30px_rgba(99,102,241,0.15)]"
      >
         <span className="text-4xl mb-3">🎁</span>
         <span className="font-bold text-indigo-200 mb-1">Mini Pack</span>
         <span className="text-indigo-300/50 text-xs text-center px-2">Unopened available</span>
      </button>
    </div>
  );
}
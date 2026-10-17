'use client';

import { useState, useEffect } from 'react';
import PlayButton from './PlayButton';
import PuzzleGame from './PuzzleGame';
import DropGame from './DropGame';
import Link from 'next/link';

export default function PlayHub({ signedIn }: { signedIn: boolean }) {
  const [focused, setFocused] = useState<'pack' | 'puzzle' | 'drop'>('pack');
  const [liveState, setLiveState] = useState<any>(null);

  useEffect(() => {
    if (!signedIn) return;
    const fetchState = async () => {
      try {
        const res = await fetch('/api/games/state');
        if (res.ok) {
          const data = await res.json();
          setLiveState(data);
        }
      } catch (err) {
        // Silent catch to prevent UI crash if fetch fails
      }
    };
    fetchState();
    const int = setInterval(fetchState, 5000);
    return () => clearInterval(int);
  }, [signedIn]);

  const panelClass = (id: string) => `
    transition-all duration-500 ease-in-out relative bg-[#0a0a14]/80 border border-white/10 rounded-3xl
    flex flex-col items-center justify-center p-6 overflow-hidden
    ${focused === id 
      ? 'flex-[3] scale-100 opacity-100 z-20 shadow-[0_0_50px_rgba(0,0,0,0.5)] cursor-default' 
      : 'flex-1 scale-95 opacity-30 blur-sm grayscale-[50%] cursor-pointer hover:opacity-50 hover:scale-95'
    }
  `;

  if (!signedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-white text-lg">Sign in with Discord to play.</p>
        <Link href="/api/auth/signin/discord?callbackUrl=/play" className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full max-w-[1800px] mx-auto p-4 gap-4 overflow-hidden">
      {/* Left: Weekly Puzzle */}
      <div className={panelClass('puzzle')} onClick={() => setFocused('puzzle')}>
        <h2 className="text-2xl font-bold text-white mb-6 sticky top-0">Weekly Puzzle</h2>
        {liveState?.puzzle ? (
          <PuzzleGame state={liveState.puzzle} isFocused={focused === 'puzzle'} />
        ) : (
          <p className="text-white/50 animate-pulse">Loading puzzle...</p>
        )}
      </div>

      {/* Center: Pack Opening */}
      <div className={panelClass('pack')} onClick={() => setFocused('pack')}>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400 mb-8 tracking-widest uppercase">
          Open Packs
        </h2>
        <PlayButton />
      </div>

      {/* Right: Random Drops */}
      <div className={panelClass('drop')} onClick={() => setFocused('drop')}>
        <h2 className="text-2xl font-bold text-white mb-6 sticky top-0">Card Drops</h2>
        {liveState?.drop ? (
          <DropGame state={liveState.drop} isFocused={focused === 'drop'} />
        ) : (
          <p className="text-white/50 text-center">No active drop right now.<br/>Check back later!</p>
        )}
      </div>
    </div>
  );
}
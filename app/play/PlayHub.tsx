'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import PlayButton from './PlayButton';
import PuzzleGame from './PuzzleGame';
import DropGame from './DropGame';

// A realistic mock state for testing the UI without live data
const DEMO_PUZZLE = {
  weekStart: new Date().toISOString().slice(0, 10),
  width: 4,
  height: 4,
  poolEmotes: [
    { id: '1412169790763700274', name: 'lilyBoop', animated: true },
    { id: '1490621781625536573', name: 'lilySparkle', animated: false },
    { id: '1488608560459026667', name: 'lilyTwoHearts', animated: false },
    { id: '1252224340554588190', name: 'lilyThink', animated: false },
    { id: '1252224340554588192', name: 'lilyCozy', animated: false },
  ],
  gridEmotes: [
    [{ id: '1412169790763700274', name: 'lilyBoop' }, { id: '1490621781625536573', name: 'lilySparkle' }, { id: '1488608560459026667', name: 'lilyTwoHearts' }, { id: '1252224340554588190', name: 'lilyThink' }],
    [{ id: '1252224340554588192', name: 'lilyCozy' }, { id: '1412169790763700274', name: 'lilyBoop' }, { id: '1490621781625536573', name: 'lilySparkle' }, { id: '1488608560459026667', name: 'lilyTwoHearts' }],
    [{ id: '1252224340554588190', name: 'lilyThink' }, { id: '1252224340554588192', name: 'lilyCozy' }, { id: '1412169790763700274', name: 'lilyBoop' }, { id: '1490621781625536573', name: 'lilySparkle' }],
    [{ id: '1488608560459026667', name: 'lilyTwoHearts' }, { id: '1252224340554588190', name: 'lilyThink' }, { id: '1252224340554588192', name: 'lilyCozy' }, { id: '1412169790763700274', name: 'lilyBoop' }],
  ],
  revealedCells: [0, 1, 2, 4, 5],
  nextCell: 3,
  revealedCounts: {
    '1412169790763700274': true,
    '1490621781625536573': true,
    '1488608560459026667': true,
  },
  guessesByCell: {
    3: [
      { userId: '1', username: 'Darcie', isCorrect: false },
      { userId: '2', username: 'Tobi', isCorrect: false },
    ]
  },
  solved: false,
  participants: ['1', '2', '3']
};

export default function PlayHub({ signedIn }: { signedIn: boolean }) {
  const [focused, setFocused] = useState<'pack' | 'puzzle' | 'drop'>('pack');
  const [liveState, setLiveState] = useState<any>(null);
  
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';

  useEffect(() => {
    if (!signedIn || isDemo) return;
    const fetchState = async () => {
      try {
        const res = await fetch('/api/games/state');
        if (res.ok) {
          const data = await res.json();
          setLiveState(data);
        }
      } catch (err) {}
    };
    fetchState();
    const int = setInterval(fetchState, 5000);
    return () => clearInterval(int);
  }, [signedIn, isDemo]);

  const panelClass = (id: string) => `
    transition-all duration-500 ease-in-out relative bg-[#0a0a14]/80 border border-white/10 rounded-3xl
    flex flex-col items-center justify-center p-4 lg:p-6 overflow-hidden
    ${focused === id 
      ? 'flex-1 lg:flex-[3] scale-100 opacity-100 z-20 shadow-[0_0_50px_rgba(0,0,0,0.5)] cursor-default' 
      : 'hidden lg:flex lg:flex-1 scale-95 opacity-30 blur-sm grayscale-[50%] cursor-pointer hover:opacity-50 hover:scale-95'
    }
  `;

  if (!signedIn && !isDemo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
        <p className="text-white text-lg text-center">Sign in with Discord to play.</p>
        <button 
          onClick={() => signIn('discord', { callbackUrl: '/play' })}
          className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500 transition"
        >
          Sign in
        </button>
      </div>
    );
  }

  const puzzleState = isDemo ? DEMO_PUZZLE : liveState?.puzzle;

  return (
    <div className="flex flex-col h-screen w-full max-w-[1800px] mx-auto lg:p-4 lg:gap-4 overflow-hidden">
      
      {/* Mobile Tab Bar */}
      <div className="lg:hidden flex items-center justify-between bg-black/60 border-b border-white/10 p-2 shrink-0 z-50">
        <button
          onClick={() => setFocused('puzzle')}
          className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${focused === 'puzzle' ? 'bg-indigo-600 text-white' : 'text-white/50 hover:bg-white/5'}`}
        >
          🧩 Puzzle
        </button>
        <button
          onClick={() => setFocused('pack')}
          className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${focused === 'pack' ? 'bg-indigo-600 text-white' : 'text-white/50 hover:bg-white/5'}`}
        >
          🎴 Packs
        </button>
        <button
          onClick={() => setFocused('drop')}
          className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${focused === 'drop' ? 'bg-indigo-600 text-white' : 'text-white/50 hover:bg-white/5'}`}
        >
          🎁 Drops
        </button>
      </div>

      {/* Main Game Area */}
      <div className="flex flex-col lg:flex-row flex-1 w-full gap-4 overflow-hidden p-4 lg:p-0">
        
        {/* Left: Weekly Puzzle */}
        <div className={panelClass('puzzle')} onClick={() => setFocused('puzzle')}>
          <h2 className="text-xl lg:text-2xl font-bold text-white mb-4 lg:mb-6 sticky top-0 z-10">Weekly Puzzle</h2>
          {puzzleState ? (
            <PuzzleGame state={puzzleState} isFocused={focused === 'puzzle'} />
          ) : (
            <p className="text-white/50 animate-pulse">Loading puzzle...</p>
          )}
        </div>

        {/* Center: Pack Opening */}
        <div className={panelClass('pack')} onClick={() => setFocused('pack')}>
          <h2 className="text-2xl lg:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400 mb-6 lg:mb-8 tracking-widest uppercase">
            Open Packs
          </h2>
          <PlayButton />
        </div>

        {/* Right: Random Drops */}
        <div className={panelClass('drop')} onClick={() => setFocused('drop')}>
          <h2 className="text-xl lg:text-2xl font-bold text-white mb-4 lg:mb-6 sticky top-0 z-10">Card Drops</h2>
          {liveState?.drop && !isDemo ? (
            <DropGame state={liveState.drop} isFocused={focused === 'drop'} />
          ) : (
            <p className="text-white/50 text-center">No active drop right now.<br/>Check back later!</p>
          )}
        </div>
        
      </div>
    </div>
  );
}
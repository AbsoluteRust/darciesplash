'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useCollectionFilter } from '@/components/CollectionFilterContext';
import PuzzleGame from './PuzzleGame';
import DropGame from './DropGame';
import PackArea from './PackArea';

export default function PlayHub({ signedIn }: { signedIn: boolean }) {
  const { userId } = useCollectionFilter();
  const [focused, setFocused] = useState<'pack' | 'puzzle' | 'drop'>('pack');
  const [liveState, setLiveState] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Group State
  const [groupLobby, setGroupLobby] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [startingGroup, setStartingGroup] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    const fetchState = async () => {
      try {
        const [stateRes, groupRes] = await Promise.all([
          fetch('/api/games/state'),
          fetch('/api/games/group/status')
        ]);
        if (stateRes.ok) setLiveState(await stateRes.json());
        if (groupRes.ok) {
          const groupData = await groupRes.json();
          setGroupLobby(groupData);
          if (groupData.active) {
            setTimeLeft(Math.max(0, Math.ceil((groupData.endsAt - Date.now()) / 1000)));
          }
        }
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };
    fetchState();
    const int = setInterval(fetchState, 2000);
    return () => clearInterval(int);
  }, [signedIn]);

  // Timer countdown
  useEffect(() => {
    if (!groupLobby?.active) return;
    const int = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((groupLobby.endsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    }, 1000);
    return () => clearInterval(int);
  }, [groupLobby]);

  const handleJoinGroup = async () => {
    if (!userId || startingGroup) return;
    setStartingGroup(true);
    try {
      const res = await fetch('/api/games/group/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const data = await res.json();
        setGroupLobby(data);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to join group.');
      }
    } finally {
      setStartingGroup(false);
    }
  };

  const isInGroup = groupLobby?.participants?.includes(userId);
  const groupActive = groupLobby?.active && isInGroup;

  const panelClass = (id: string) => `
    transition-all duration-500 ease-in-out relative bg-[#0a0a14]/80 border border-white/10 rounded-3xl
    flex flex-col items-center justify-start p-4 lg:p-6 overflow-y-auto overflow-x-hidden custom-scrollbar min-h-0
    ${focused === id 
      ? 'flex-1 lg:flex-[3] scale-100 opacity-100 z-20 shadow-[0_0_50px_rgba(0,0,0,0.5)] cursor-default' 
      : 'hidden lg:flex lg:flex-1 scale-95 opacity-30 blur-sm grayscale-[50%] cursor-pointer hover:opacity-50 hover:scale-95'
    }
  `;

  if (!signedIn) {
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

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)] mt-16 w-full max-w-[1800px] mx-auto lg:px-4 lg:pb-4 lg:gap-4 overflow-hidden">
      <div className="lg:hidden flex items-center justify-between bg-black/60 border-b border-white/10 p-2 shrink-0 z-40 w-full">
        <button onClick={() => setFocused('puzzle')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${focused === 'puzzle' ? 'bg-indigo-600 text-white' : 'text-white/50 hover:bg-white/5'}`}>🧩 Puzzle</button>
        <button onClick={() => setFocused('pack')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${focused === 'pack' ? 'bg-indigo-600 text-white' : 'text-white/50 hover:bg-white/5'}`}>🎴 Packs</button>
        <button onClick={() => setFocused('drop')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${focused === 'drop' ? 'bg-indigo-600 text-white' : 'text-white/50 hover:bg-white/5'}`}>🎁 Drops</button>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 w-full gap-4 overflow-hidden p-4 lg:p-0 min-h-0">
        {/* Left: Weekly Puzzle */}
        <div className={panelClass('puzzle')} onClick={() => setFocused('puzzle')}>
          <h2 className="text-xl lg:text-2xl font-bold text-white mb-4 lg:mb-6 w-full text-center">Weekly Puzzle</h2>
          {liveState?.puzzle ? (
            <PuzzleGame 
              state={liveState.puzzle} 
              allStaticEmotes={liveState.allStaticEmotes} 
              isFocused={focused === 'puzzle'} 
            />
          ) : (
            <p className="text-white/50 text-center">{loading ? 'Loading...' : 'No puzzle found.'}</p>
          )}
        </div>

        {/* Center: Pack Opening */}
        <div className={panelClass('pack')} onClick={() => setFocused('pack')}>
          <div className="flex flex-col items-center justify-center mb-6 w-full">
            <div className="flex items-center justify-center gap-4">
              <h2 className="text-2xl lg:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400 tracking-widest uppercase">
                Open Packs
              </h2>
              <button 
                onClick={(e) => { e.stopPropagation(); if (!groupActive) handleJoinGroup(); }}
                disabled={groupActive || startingGroup}
                className={`
                  text-sm lg:text-lg font-black tracking-widest uppercase transition-all duration-300
                  ${groupActive
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)] cursor-default'
                    : 'text-white/20 hover:text-white/50'
                  }
                `}
              >
                WITH FRIENDS!
              </button>
            </div>

            {/* Group Lobby UI */}
            {groupActive && (
              <div className="mt-6 flex flex-col items-center bg-[#181820] border border-indigo-500/30 rounded-2xl p-6 w-full max-w-md shadow-[0_0_30px_rgba(99,102,241,0.15)] animate-fadeIn">
                <p className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-1">Group Pack Opening</p>
                <p className="text-5xl font-black font-mono text-white mb-4">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </p>
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {groupLobby.participants.map((id: string) => (
                    <span key={id} className={`px-3 py-1 rounded-full text-xs font-bold ${id === userId ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white/70'}`}>
                      {id === userId ? 'You' : 'Player'}
                    </span>
                  ))}
                </div>
                <p className="text-center text-sm text-white/60 mb-4">
                  {groupLobby.participants.length > 1 
                    ? "Everyones' packs will open simultaneously when the timer ends, with chances at bonus loot!"
                    : "Waiting for others to join... Click 'WITH FRIENDS!' to invite them!"}
                </p>
              </div>
            )}

            {/* Results Screen */}
            {groupLobby?.results && isInGroup && !groupLobby.active && (
              <div className="mt-6 flex flex-col items-center bg-[#181820] border border-green-500/30 rounded-2xl p-6 w-full max-w-md shadow-[0_0_30px_rgba(34,197,94,0.15)]">
                <p className="text-xl font-bold text-green-400 mb-2">Session Ended!</p>
                <p className="text-center text-sm text-white mb-4">{groupLobby.results.bonusMessage}</p>
                <button onClick={() => setGroupLobby(null)} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-bold transition">
                  Close
                </button>
              </div>
            )}
          </div>

          <PackArea groupActive={groupActive} groupTimeLeft={timeLeft} />
        </div>

        {/* Right: Random Drops */}
        <div className={panelClass('drop')} onClick={() => setFocused('drop')}>
          <h2 className="text-xl lg:text-2xl font-bold text-white mb-4 lg:mb-6 w-full text-center">Card Drops</h2>
          {liveState?.drop ? (
            <DropGame 
              state={liveState.drop} 
              nextDropAt={liveState.nextDropAt} 
              isFocused={focused === 'drop'} 
            />
          ) : (
            <p className="text-white/50 text-center">{loading ? 'Loading...' : 'Waiting for next drop...'}</p>
          )}
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useCollectionFilter } from '@/components/CollectionFilterContext';
import PuzzleGame from './PuzzleGame';
import DropGame from './DropGame';
import PackArea from './PackArea';
import PackReveal from './PackReveal';

export default function PlayHub({ signedIn }: { signedIn: boolean }) {
  const { userId } = useCollectionFilter();
  const [focused, setFocused] = useState<'pack' | 'puzzle' | 'drop'>('pack');
  const [liveState, setLiveState] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [groupLobby, setGroupLobby] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [startingGroup, setStartingGroup] = useState(false);
  const [sendingGroupEmote, setSendingGroupEmote] = useState<string | null>(null);

  const groupEmotes = [
    { collection: 'darcie', label: 'Darcie', fallback: 'darPacks' },
    { collection: 'tobi', label: 'Tobi', fallback: 'tobiSparkle' },
    { collection: 'madolche', label: 'Madolche / Magi', fallback: 'magiHappy' },
    { collection: 'celestial', label: 'Celestial / Lily', fallback: 'lilySip' },
    { collection: 'lunalux', label: 'LunaLux', fallback: 'luxSit' },
  ];

  const handleGroupEmote = async (collection: string) => {
    if (!groupActive || sendingGroupEmote) return;
    setSendingGroupEmote(collection);
    try {
      const res = await fetch('/api/games/group/emote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection }),
      });
      if (res.ok) {
        const data = await res.json();
        setGroupLobby((previous: any) => previous ? { ...previous, endsAt: data.endsAt, emoteClicks: data.emoteClicks } : previous);
        setTimeLeft(Math.max(0, Math.ceil((data.endsAt - Date.now()) / 1000)));
      }
    } finally {
      setSendingGroupEmote(null);
    }
  };
  
  // New state to prevent the modal from re-opening
  const [dismissedResult, setDismissedResult] = useState<number | null>(null);

  const [webRevealPack, setWebRevealPack] = useState<any>(null);
  const [closedRevealShortIds, setClosedRevealShortIds] = useState<string[]>([]);
  const [revealHistoryLoaded, setRevealHistoryLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('folly:group-reveals');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setClosedRevealShortIds(parsed.filter((id): id is string => typeof id === 'string'));
      }
    } catch {
      // Ignore unavailable or malformed client storage.
    } finally {
      setRevealHistoryLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!signedIn || !revealHistoryLoaded) return;
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
            if (dismissedResult) setDismissedResult(null);
          } else if (groupData.results && !webRevealPack) {
            const myPack = groupData.results.packs?.find((p: any) => p.userId === userId);
            if (myPack && !closedRevealShortIds.includes(myPack.shortId)) {
              setWebRevealPack(myPack);
            }
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
  }, [signedIn, userId, webRevealPack, closedRevealShortIds, dismissedResult]);

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

  const isInGroup = groupLobby?.participants?.some((p: any) => p.id === userId) && groupLobby.participants.length > 0;
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

            {groupActive && (
              <div className="mt-6 flex flex-col items-center bg-[#181820] border border-indigo-500/30 rounded-2xl p-6 w-full max-w-md shadow-[0_0_30px_rgba(99,102,241,0.15)] animate-fadeIn">
                <p className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-1">Group Pack Opening</p>
                
                {timeLeft > 0 ? (
                  <p className="text-5xl font-black font-mono text-white mb-6">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </p>
                ) : (
                  <p className="text-2xl font-bold text-yellow-400 animate-pulse mb-6 py-3">
                    Opening packs...
                  </p>
                )}
                
                <div className="flex flex-wrap justify-center gap-3 mb-6">
                  {groupLobby.participants.map((p: any) => (
                    <div key={p.id} className="relative group/avatar flex items-center justify-center">
                      <a
                        href={`/profiles/${p.id}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`View ${p.name}'s profile`}
                        className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#181820]"
                      >
                        <img
                          src={p.avatar}
                          alt={p.name}
                          className={`w-12 h-12 rounded-full border-2 transition-all ${p.id === userId ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.6)]' : 'border-white/20 hover:border-white/50'}`}
                        />
                      </a>
                      <span className="absolute -bottom-8 bg-black/90 text-white text-xs px-2.5 py-1 rounded-md whitespace-nowrap opacity-0 group-hover/avatar:opacity-100 transition-opacity pointer-events-none z-10 border border-white/10 shadow-lg">
                        {p.name} {p.id === userId ? '(You)' : ''}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mb-6 w-full rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-white/50">Boost a collection</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {groupEmotes.map((emote: any) => {
                      const emoji = groupLobby.emotes?.[emote.collection];
                      const clicks = groupLobby.emoteClicks?.[emote.collection] || 0;
                      const emojiUrl = emoji?.id ? `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}?size=64` : null;
                      return (
                        <button
                          key={emote.collection}
                          type="button"
                          onClick={(event) => { event.stopPropagation(); handleGroupEmote(emote.collection); }}
                          disabled={!!sendingGroupEmote}
                          title={`${emote.label}: ${clicks} boost${clicks === 1 ? '' : 's'}`}
                          className="flex min-w-16 flex-col items-center gap-1 rounded-xl px-2 py-2 text-white transition hover:bg-white/10 disabled:opacity-60"
                        >
                          {emojiUrl ? <img src={emojiUrl} alt={emote.fallback} className="h-8 w-8 object-contain" /> : <span className="text-xs">:{emote.fallback}:</span>}
                          <span className="text-[10px] text-white/60">{clicks}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <p className="text-center text-sm text-white/60">
                  {groupLobby.participants.length > 1 
                    ? "Everyones' packs will open simultaneously when the timer ends, with chances at bonus loot!"
                    : "Waiting for others to join... Click 'WITH FRIENDS!' to invite them!"}
                </p>
              </div>
            )}

            {groupLobby?.results && isInGroup && !groupActive && groupLobby.results.finishedAt !== dismissedResult && (
              <div className="mt-6 flex flex-col items-center bg-[#181820] border border-green-500/30 rounded-2xl p-6 w-full max-w-md shadow-[0_0_30px_rgba(34,197,94,0.15)]">
                <p className="text-xl font-bold text-green-400 mb-4">Session Ended!</p>
                
                <div className="flex flex-col gap-3 mb-6 w-full">
                  {groupLobby.results.bonusLoot?.length > 0 ? (
                    groupLobby.results.bonusLoot.map((loot: any, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
                        <span className="text-white/80 font-medium text-sm">{loot.label}</span>
                        <div className="flex -space-x-2">
                          {loot.users.map((uid: string) => {
                            const profile = groupLobby.results.participants.find((p: any) => p.id === uid);
                            if (!profile) return null;
                            return (
                              <img
                                key={uid}
                                src={profile.avatarUrl}
                                alt={profile.name}
                                title={profile.name}
                                className="w-8 h-8 rounded-full border-2 border-[#181820] relative hover:z-10 hover:scale-110 transition-transform cursor-help"
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-white/50 text-sm italic">No bonus loot this time.</p>
                  )}
                </div>

                <button onClick={() => setDismissedResult(groupLobby.results.finishedAt)} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-bold transition">
                  Close
                </button>
              </div>
            )}
          </div>

          <PackArea groupActive={groupActive} groupTimeLeft={timeLeft} />
        </div>

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

      {webRevealPack && (
        <PackReveal
          cards={webRevealPack.cards}
          shortId={webRevealPack.shortId}
          canReroll={false}
          onClose={() => {
            setClosedRevealShortIds(prev => {
              const next = prev.includes(webRevealPack.shortId)
                ? prev
                : [...prev, webRevealPack.shortId];
              try {
                window.localStorage.setItem('folly:group-reveals', JSON.stringify(next));
              } catch {
                // Ignore unavailable client storage; the current session still stays closed.
              }
              return next;
            });
            setWebRevealPack(null);
            
            fetch('/api/games/reveal', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ shortId: webRevealPack.shortId })
            }).catch(console.error);
          }}
        />
      )}
    </div>
  );
}

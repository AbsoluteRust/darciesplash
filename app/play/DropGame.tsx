'use client';

import { useState, useEffect } from 'react';
import ProfileCard from '@/components/ProfileCard';

export default function DropGame({ 
  state, 
  nextDropAt, 
  isFocused 
}: { 
  state: any, 
  nextDropAt: number | null, 
  isFocused: boolean 
}) {
  const [timeLeft, setTimeLeft] = useState('');
  const [localGuess, setLocalGuess] = useState<string | null>(null);
  const [isGuessing, setIsGuessing] = useState(false);

  // Reset local guess if a new drop starts
  useEffect(() => {
    setLocalGuess(null);
  }, [state.startedAt]);

  const hasGuessed = state.userGuess || localGuess;
  const guessedEmoteId = state.userGuess || localGuess;

  const handleGuess = async (emoteId: string) => {
    if (!isFocused || hasGuessed || isGuessing) return;
    
    setIsGuessing(true);
    const res = await fetch('/api/games/guess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        emoteId, 
        game: 'drop', 
        gameType: state.gameType 
      }),
    });
    const data = await res.json();
    
    if (data.ok) {
      // No alert! Just set local state so the UI locks in.
      setLocalGuess(emoteId);
    } else {
      alert(data.error);
    }
    setIsGuessing(false);
  };

  useEffect(() => {
    if (!nextDropAt) return;
    
    const timer = setInterval(() => {
      const now = Date.now();
      const diff = nextDropAt - now;
      
      if (diff <= 0) {
        setTimeLeft('Dropping now...');
        return;
      }
      
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      
      setTimeLeft(`${h}h ${m}m ${s}s`);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [nextDropAt]);

  const isCompleted = state.winners && state.winners.length > 0;

  return (
    <div className="w-full h-full flex flex-col items-center justify-between gap-4 overflow-y-auto custom-scrollbar pb-6">
      
      {/* The Card */}
      <div className="w-[160px] sm:w-[180px] md:w-[200px] mt-4 shrink-0">
        <div className="
          [&_.pc-card]:!h-auto 
          [&_.pc-card]:!max-h-none 
          [&_.pc-card-wrapper]:!max-w-full
          [&_.pc-details_h3]:!text-[18px] 
          [&_.pc-details_p]:!text-[12px]
          [&_.pc-handle]:!text-[10px]
          [&_.pc-status]:!text-[10px]
          [&_.pc-mini-avatar]:!w-[24px]
          [&_.pc-mini-avatar]:!h-[24px]
        ">
          <ProfileCard
            name={state.cardName || 'Unknown Card'}
            title={state.cardType || 'Emote'}
            handle={(state.cardName || 'unknown').toLowerCase().replace(/\s+/g, '-')}
            status="Online"
            contactText="View"
            avatarUrl={state.rawImageUrl || ''}
            rarity={state.rarity}
            showUserInfo={false}
            enableTilt={true}
            enableMobileTilt={false}
            behindGlowColor={state.cardColor || '#fff'}
            iconUrl={null}
            behindGlowEnabled
            innerGradient="linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)"
            isModal={true}
          />
        </div>
      </div>

      {/* Guess Buttons */}
      <div className="flex gap-3 flex-wrap justify-center max-w-sm shrink-0">
        {(state.optionEmotes || []).map((emote: any) => {
          const isPicked = guessedEmoteId === emote.id;
          
          return (
            <button
              key={emote.id}
              onClick={() => handleGuess(emote.id)}
              disabled={!!hasGuessed || !isFocused || isCompleted || isGuessing}
              className={`
                p-3 rounded-2xl border transition-all
                ${isPicked 
                  ? 'bg-green-600/30 border-green-400 scale-105 shadow-[0_0_15px_rgba(34,197,94,0.5)]' 
                  : 'bg-white/5 border-white/10 hover:bg-white/20 hover:scale-110 disabled:opacity-50 disabled:hover:scale-100'
                }
              `}
            >
              <img 
                src={`https://cdn.discordapp.com/emojis/${emote.id}.${emote.animated ? 'gif' : 'png'}`} 
                className={`w-10 h-10 ${hasGuessed && !isPicked ? 'grayscale opacity-30' : ''}`}
              />
            </button>
          );
        })}
      </div>

      {/* Status Text */}
      <div className="text-center h-12 flex items-center justify-center shrink-0">
        {hasGuessed && !isCompleted ? (
          <p className="text-indigo-300 animate-pulse">Waiting for the next drop to reveal the winner...</p>
        ) : !isCompleted ? (
          <p className="text-cyan-400 font-mono text-lg font-bold">
            Next drop in: {timeLeft || 'Calculating...'}
          </p>
        ) : null}
      </div>

      {/* Previous Winners Display */}
      {state.previousWinners && state.previousWinners.length > 0 && (
        <div className="text-center mt-2 p-3 bg-black/40 rounded-xl border border-white/10 w-full max-w-sm shrink-0">
          <p className="text-green-400 font-bold text-sm mb-1">Previous Drop Results</p>
          <p className="text-white/60 text-xs mb-1">
            Winners: {state.previousWinners.map((id: string) => `<@${id}>`).join(', ')}
          </p>
          {state.previousParticipants && state.previousParticipants.length > 0 && (
            <p className="text-white/40 text-[10px]">
              {state.previousParticipants.length} total participants
            </p>
          )}
        </div>
      )}

    </div>
  );
}
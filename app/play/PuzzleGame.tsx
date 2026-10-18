'use client';

import { useState, useEffect } from 'react';
import ProfileCard from '@/components/ProfileCard';

export default function PuzzleGame({ state, isFocused }: { state: any, isFocused: boolean }) {
  const [hoveredCell, setHoveredCell] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [cardsData, setCardsData] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/cards/list')
      .then(r => r.ok ? r.json() : [])
      .then(data => setCardsData(Array.isArray(data) ? data : []))
      .catch(() => setCardsData([]));
  }, []);

  useEffect(() => {
    if (state.solved) {
      setTimeLeft('Solved!');
      return;
    }

    const timer = setInterval(() => {
      if (!state.weekStart) return;
      const now = new Date();
      const weekStart = new Date(state.weekStart + 'T00:00:00Z');
      
      const friday = new Date(weekStart.getTime() + 5 * 86400000 + 13 * 3600000);
      const saturday = new Date(weekStart.getTime() + 6 * 86400000 + 13 * 3600000);
      const nextWeek = new Date(weekStart.getTime() + 7 * 86400000 + 8 * 3600000);

      let target = nextWeek;
      if (now < friday) target = friday;
      else if (now < saturday) target = saturday;

      const diff = target.getTime() - now.getTime();
      if (diff <= 0) { setTimeLeft('Event starting...'); return; }
      
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff / 3600000) % 24);
      const m = Math.floor((diff / 60000) % 60);
      const s = Math.floor((diff / 1000) % 60);
      
      setTimeLeft(`${d > 0 ? d + 'd ' : ''}${h}h ${m}m ${s}s`);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [state.weekStart, state.solved]);

  const handleGuess = async (emoteId: string) => {
    if (!isFocused || state.solved) return;
    
    const res = await fetch('/api/games/guess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoteId, game: 'puzzle' }),
    });
    const data = await res.json();
    if (data.error) alert(data.error);
  };

  const openCardModal = (emoteName: string) => {
    if (!emoteName || !Array.isArray(cardsData)) return;
    const card = cardsData.find(c => c.name.toLowerCase() === emoteName.toLowerCase());
    if (card) setSelectedCard(card);
  };

  const currentCell = state.nextCell;
  const currentGuesses = (state.guessesByCell || {})[currentCell] || [];
  
  // Safely determine which emotes to show. 
  // If the bot sends allStaticEmotes (even if empty), we check the length.
  const emotesToDisplay = (state.allStaticEmotes && state.allStaticEmotes.length > 0) 
    ? state.allStaticEmotes 
    : (state.poolEmotes || []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-between gap-6 overflow-y-auto custom-scrollbar pb-6">
      
      <div className={`text-xl font-mono px-6 py-2 rounded-full border shadow-lg transition-colors shrink-0 ${
        state.solved 
          ? 'text-green-400 bg-green-950/30 border-green-800' 
          : 'text-cyan-400 bg-cyan-950/30 border-cyan-800'
      }`}>
        {state.solved ? '🎉 Puzzle Solved!' : `Next Event: ${timeLeft || 'Loading...'}`}
      </div>

      <div 
        className="grid gap-2 bg-black/40 p-4 rounded-2xl border border-white/5 shrink-0" 
        style={{ gridTemplateColumns: `repeat(${state.width || 5}, minmax(0, 1fr))` }}
      >
        {(state.gridEmotes || []).map((row: any[], r: number) => 
          (row || []).map((emote: any, c: number) => {
            const idx = r * state.width + c;
            const isRevealed = (state.revealedCells || []).includes(idx);
            const isCurrent = currentCell === idx;
            const guesses = (state.guessesByCell || {})[idx] || [];

            return (
              <div 
                key={idx}
                onMouseEnter={() => setHoveredCell(idx)}
                onMouseLeave={() => setHoveredCell(null)}
                className={`
                  relative w-12 h-12 md:w-16 md:h-16 rounded-xl flex items-center justify-center text-2xl transition-all
                  ${isCurrent && !state.solved ? 'bg-indigo-600/30 border-2 border-indigo-400 animate-pulse' : 
                    isRevealed ? 'bg-white/10 border border-white/20' : 'bg-white/5 border border-white/5'}
                `}
              >
                {isRevealed ? (
                  <button 
                    onClick={() => openCardModal(emote.name)}
                    className="w-full h-full flex items-center justify-center hover:scale-110 transition"
                  >
                    <img 
                      src={`https://cdn.discordapp.com/emojis/${emote.id}.${emote.animated ? 'gif' : 'png'}`} 
                      className="w-10 h-10 md:w-12 md:h-12 drop-shadow-md"
                      alt={emote.name}
                    />
                  </button>
                ) : (
                  <span className="opacity-50 text-white/50">❓</span>
                )}

                {hoveredCell === idx && !isRevealed && isFocused && (
                  <div className="absolute bottom-full mb-2 w-56 bg-[#181820] text-xs text-white p-3 rounded-xl border border-white/20 z-50 shadow-2xl pointer-events-none">
                    <p className="font-bold border-b border-white/10 pb-2 mb-2 text-indigo-300">Guesses for this cell:</p>
                    {guesses.length === 0 ? <p className="opacity-50 italic">No guesses yet.</p> : (
                      <ul className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                        {guesses.map((g: any, i: number) => (
                          <li key={i} className="flex justify-between">
                            <span className="truncate pr-2">{g.username}</span>
                            <span className={g.isCorrect ? 'text-green-400' : 'text-red-400'}>{g.isCorrect ? '✓' : '✗'}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Emote Keyboard */}
      <div className="w-full max-w-2xl bg-[#181820] p-4 rounded-2xl border border-white/10 shrink-0">
        <p className="text-xs text-center text-white/50 mb-3 uppercase tracking-wider font-bold">
          Select an Emote
        </p>
        {/* Made the keyboard scrollable to handle all server emotes */}
        <div className="flex flex-wrap justify-center gap-2 max-h-48 overflow-y-auto custom-scrollbar p-2">
          {emotesToDisplay.map((emote: any) => {
            // Check if this emote was guessed incorrectly for THIS specific cell
            const isIncorrect = currentGuesses.some((g: any) => g.emoteId === emote.id && !g.isCorrect);
            
            return (
              <button
                key={emote.id}
                disabled={isIncorrect || !isFocused || state.solved}
                onClick={() => handleGuess(emote.id)}
                className={`
                  p-2 rounded-xl border transition-all
                  ${isIncorrect ? 'opacity-20 grayscale cursor-not-allowed border-transparent bg-black' : 
                    'bg-white/5 border-white/10 hover:bg-white/20 hover:scale-110 active:scale-95 cursor-pointer'}
                `}
              >
                <img 
                  src={`https://cdn.discordapp.com/emojis/${emote.id}.${emote.animated ? 'gif' : 'png'}`} 
                  className="w-8 h-8" 
                  alt={emote.name}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Card Modal */}
      {selectedCard && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in" 
          onClick={() => setSelectedCard(null)}
        >
          <div 
            className="w-full max-w-sm animate-in zoom-in-95" 
            onClick={e => e.stopPropagation()}
          >
            <ProfileCard
              name={selectedCard.name}
              title={selectedCard.type}
              handle={selectedCard.name.toLowerCase().replace(/\s+/g, '-')}
              status="Online"
              contactText="Close"
              avatarUrl={selectedCard.thumbUrl || selectedCard.image}
              rarity={selectedCard.rarity}
              showUserInfo={false}
              enableTilt={true}
              behindGlowColor="#fff"
              iconUrl={null}
              behindGlowEnabled
              isModal={true}
              onContactClick={() => setSelectedCard(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
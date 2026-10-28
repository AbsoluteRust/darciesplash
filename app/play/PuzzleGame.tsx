'use client';

import { useState } from 'react';

export default function PuzzleGame({
  state,
  allStaticEmotes,
  isFocused,
}: {
  state: any;
  allStaticEmotes: any[];
  isFocused: boolean;
}) {
  const [isGuessing, setIsGuessing] = useState<string | null>(null);

  if (!state) return null;

  const width = state.width;
  const height = state.height;
  const revealedCells = new Set(state.revealedCells || []);
  const guessesByCell = state.guessesByCell || {};

  // Calculate incorrect emotes for the current cell to grey them out on the keyboard
  const currentCell = state.nextCell;
  const cellGuesses = guessesByCell[currentCell] || [];
  const incorrectEmotes = new Set(
    cellGuesses
      .filter((g: any) => !g.isCorrect)
      .map((g: any) => g.emoteId)
  );

  // Helper to group multiple guesses by the same user
  const groupGuesses = (guesses: any[]) => {
    const grouped: Record<string, { username: string; emotes: string[] }> = {};
    for (const g of guesses) {
      if (!grouped[g.userId]) {
        grouped[g.userId] = { username: g.username || 'User', emotes: [] };
      }
      grouped[g.userId].emotes.push(g.emoteId);
    }
    return Object.values(grouped);
  };

  const renderEmote = (id: string) => {
    const emote = allStaticEmotes.find((e) => e.id === id);
    if (!emote) return <span className="text-white/50 text-xs">?</span>;
    return (
      <img
        src={`https://cdn.discordapp.com/emojis/${emote.id}.${emote.animated ? 'gif' : 'png'}`}
        alt={emote.name}
        className="w-8 h-8 object-contain"
      />
    );
  };

  const handleGuess = async (emoteId: string) => {
    if (!isFocused || state.solved || isGuessing) return;
    setIsGuessing(emoteId);
    try {
      const res = await fetch('/api/games/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoteId, game: 'puzzle' }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Guess failed');
      }
    } finally {
      setIsGuessing(null);
    }
  };

  return (
    <div className="flex flex-col items-center w-full gap-6">
      
      {/* Grid Info */}
      <div className="text-center text-sm text-white/60">
        <p>Grid size: <strong className="text-white">{width}×{height}</strong></p>
        <p>Progress: <strong className="text-white">{revealedCells.size}/{width * height}</strong></p>
      </div>

      {/* The Grid */}
      <div 
        className="grid gap-2 bg-[#0a0a14] p-4 rounded-2xl border border-white/10 shadow-2xl"
        style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))` }}
      >
        {state.grid.map((row: (string | null)[], r: number) =>
          row.map((id: string | null, c: number) => {
            const idx = r * width + c;
            const isRevealed = revealedCells.has(idx);
            const cellGuesses = guessesByCell[idx] || [];
            const grouped = groupGuesses(cellGuesses);

            return (
              <div 
                key={idx} 
                className="relative group flex justify-center"
              >
                {/* The Cell Itself */}
                <div 
                  className={`
                    w-12 h-12 flex items-center justify-center rounded-lg border transition-colors
                    ${isRevealed 
                      ? 'bg-white/10 border-white/30' 
                      : 'bg-black/40 border-white/10 hover:border-white/30 cursor-help'
                    }
                  `}
                >
                  {isRevealed && id ? renderEmote(id) : <span className="text-white/30 text-lg">❓</span>}
                </div>

                {/* The Tooltip (with pb-2 bridge to keep hover active) */}
                {!isRevealed && grouped.length > 0 && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-[#181820] border border-white/20 rounded-xl p-3 shadow-2xl w-56 max-h-40 overflow-y-auto custom-scrollbar pointer-events-auto">
                      <p className="text-[10px] uppercase text-white/40 tracking-wider font-bold mb-2 sticky top-0 bg-[#181820]">
                        Guesses
                      </p>
                      {grouped.map((user) => (
                        <div key={user.username} className="flex items-start gap-2 mb-2 last:mb-0">
                          <span className="text-xs text-white/70 font-semibold truncate max-w-[80px]" title={user.username}>
                            {user.username}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {user.emotes.map((emoteId, eIdx) => {
                              const emote = allStaticEmotes.find((e) => e.id === emoteId);
                              return emote ? (
                                <img
                                  key={eIdx}
                                  src={`https://cdn.discordapp.com/emojis/${emote.id}.${emote.animated ? 'gif' : 'png'}`}
                                  className="w-5 h-5 object-contain"
                                  alt={emote.name}
                                />
                              ) : null;
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Revealed Emotes Counts */}
      {state.revealedCounts && Object.keys(state.revealedCounts).length > 0 && (
        <div className="w-full max-w-lg p-4 bg-[#0a0a14] border border-white/10 rounded-2xl flex flex-col gap-3">
          <p className="text-xs font-bold text-white/50 uppercase tracking-wider">Revealed Emotes</p>
          <div className="flex flex-wrap gap-3">
            {Object.keys(state.revealedCounts).map((emoteId) => {
              const emote = allStaticEmotes.find((e) => e.id === emoteId);
              const count = state.emoteCounts?.[emoteId] || 0;
              return (
                <div key={emoteId} className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                  {emote ? (
                    <img
                      src={`https://cdn.discordapp.com/emojis/${emote.id}.${emote.animated ? 'gif' : 'png'}`}
                      className="w-6 h-6 object-contain"
                      alt={emote.name}
                    />
                  ) : (
                    <span className="w-6 h-6 flex items-center justify-center text-white/50 text-xs">?</span>
                  )}
                  <span className="text-white font-bold">{count}</span>
                  <span className="text-white/40 text-xs">in grid</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* The Keyboard (All Server Emotes) */}
      {!state.solved && (
        <div className="w-full max-w-2xl mt-2">
          <div className="max-h-48 overflow-y-auto custom-scrollbar bg-[#0a0a14] p-3 rounded-2xl border border-white/10 shadow-inner flex flex-wrap gap-2 justify-center">
            {allStaticEmotes.map((emote: any) => {
              const isIncorrect = incorrectEmotes.has(emote.id);
              const isSpinning = isGuessing === emote.id;

              return (
                <button
                  key={emote.id}
                  disabled={isIncorrect || state.solved || !!isGuessing}
                  onClick={() => handleGuess(emote.id)}
                  title={emote.name}
                  className={`
                    relative w-10 h-10 rounded-lg flex items-center justify-center border transition-all shrink-0
                    ${isIncorrect 
                      ? 'bg-black/20 border-white/5 opacity-30 grayscale cursor-not-allowed' 
                      : 'bg-white/5 border-white/10 hover:bg-white/20 hover:scale-110 cursor-pointer'
                    }
                  `}
                >
                  {isSpinning && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                  <img
                    src={`https://cdn.discordapp.com/emojis/${emote.id}.${emote.animated ? 'gif' : 'png'}`}
                    alt={emote.name}
                    className="w-6 h-6 object-contain"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Status / Rules */}
      <div className="text-center max-w-sm text-sm text-white/50 space-y-2">
        {state.solved ? (
          <p className="text-green-400 font-bold text-lg">🎉 Puzzle Solved!</p>
        ) : (
          <>
            <p>Click an emote above, or post a static emote in the Discord thread.</p>
            <p>
              Each player has <strong className="text-white">4</strong> guesses +<strong className="text-white">1 per day</strong>.
            </p>
          </>
        )}
      </div>

    </div>
  );
}
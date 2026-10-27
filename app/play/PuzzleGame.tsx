'use client';

import { useState } from 'react';

function formatEmote(emote: any) {
  if (!emote) return '❓';
  return `<${emote.animated ? 'a' : ''}:${emote.name}:${emote.id}>`;
}

export default function PuzzleGame({
  state,
  allStaticEmotes,
  isFocused,
}: {
  state: any;
  allStaticEmotes: any[];
  isFocused: boolean;
}) {
  const [hoveredCell, setHoveredCell] = useState<number | null>(null);

  if (!state) return null;

  const width = state.width;
  const height = state.height;
  const revealedCells = new Set(state.revealedCells || []);
  const guessesByCell = state.guessesByCell || {};

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
                onMouseEnter={() => setHoveredCell(idx)}
                onMouseLeave={() => setHoveredCell(null)}
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

                {/* The Tooltip */}
                {!isRevealed && grouped.length > 0 && (
                  <div className="absolute bottom-full pb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50">
                    <div className="bg-[#181820] border border-white/20 rounded-xl p-3 shadow-2xl w-48 max-h-40 overflow-y-auto custom-scrollbar">
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
                                  className="w-4 h-4 object-contain"
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

      {/* Status / Rules */}
      <div className="text-center max-w-sm text-sm text-white/50 space-y-2">
        {state.solved ? (
          <p className="text-green-400 font-bold text-lg">🎉 Puzzle Solved!</p>
        ) : (
          <>
            <p>Post a single static emote in the Discord thread to guess the next cell.</p>
            <p>
              Each player has <strong className="text-white">4</strong> guesses +<strong className="text-white">1 per day</strong>.
            </p>
          </>
        )}
      </div>

    </div>
  );
}
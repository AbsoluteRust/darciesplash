'use client';

import { useState, useEffect } from 'react';
import { useCollectionFilter } from '@/components/CollectionFilterContext';

// Mirrors constants from the bot's config.js and games/puzzle.js. Update
// both if these change.
const PUZZLE_BASE_GUESSES = 5;
const PUZZLE_GUESSES_PER_DAY = 2;
const PUZZLE_PARTICIPATION_STREAK = 10;
const PUZZLE_POINTS_PER_TILE = 500;

export default function PuzzleGame({
  state,
  allStaticEmotes,
  isFocused,
}: {
  state: any;
  allStaticEmotes: any[];
  isFocused: boolean;
}) {
  const { userId } = useCollectionFilter();
  const [isGuessing, setIsGuessing] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [guessFeedback, setGuessFeedback] = useState<'correct' | 'incorrect' | null>(null);

  // Handle the countdown timer for the next guess
  useEffect(() => {
    if (!state || !userId) return;

    const used = state.guesses[userId] || 0;
    const daysSinceStart = Math.floor((Date.now() - state.startedAt) / (24 * 60 * 60 * 1000));
    const totalBudget = PUZZLE_BASE_GUESSES + Math.max(0, daysSinceStart) * PUZZLE_GUESSES_PER_DAY;
    const remaining = totalBudget - used;

    if (remaining > 0) {
      setTimeLeft('');
      return; // No timer needed if they have guesses left
    }

    const nextGuessTime = state.startedAt + (daysSinceStart + 1) * 24 * 60 * 60 * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const diff = nextGuessTime - now;
      
      if (diff <= 0) {
        setTimeLeft('00:00:00');
        return;
      }
      
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };

    updateTimer();
    const int = setInterval(updateTimer, 1000);
    return () => clearInterval(int);
  }, [state, userId]);

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

  // Calculate user guesses
  const used = state.guesses[userId || ''] || 0;
  const daysSinceStart = Math.floor((Date.now() - state.startedAt) / (24 * 60 * 60 * 1000));
  const totalBudget = PUZZLE_BASE_GUESSES + Math.max(0, daysSinceStart) * PUZZLE_GUESSES_PER_DAY;
  const remaining = totalBudget - used;

  // Reward math — 500 points per tile, flat, paid once when the puzzle closes.
  const tileCount = width * height;
  const pointsAward = PUZZLE_POINTS_PER_TILE * tileCount;

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
    if (!isFocused || state.solved || isGuessing || remaining <= 0) return;
    
    setIsGuessing(emoteId);
    setGuessFeedback(null);

    try {
      const res = await fetch('/api/games/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoteId, game: 'puzzle' }),
      });
      const data = await res.json();
      
      if (res.ok && data.isCorrect !== undefined) {
        setGuessFeedback(data.isCorrect ? 'correct' : 'incorrect');
        setTimeout(() => setGuessFeedback(null), 1500);
      } else {
        alert(data.error || 'Guess failed');
      }
    } finally {
      setIsGuessing(null);
    }
  };

  return (
    <div className="flex flex-col items-center w-full gap-6">
      
      {/* Guesses Indicator */}
      <div className="flex items-center justify-center gap-4 bg-[#0a0a14] border border-white/10 rounded-2xl px-6 py-3 shadow-lg">
        <div className="text-center">
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-0.5">Your Guesses</p>
          {remaining > 0 ? (
            <p className="text-xl font-bold text-indigo-400">
              {remaining} <span className="text-sm text-white/40 font-normal">left</span>
            </p>
          ) : (
            <p className="text-lg font-mono font-bold text-red-400">
              {timeLeft || '00:00:00'}
            </p>
          )}
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="text-center">
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-0.5">Grid Size</p>
          <p className="text-xl font-bold text-white">{width}×{height}</p>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="text-center">
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-0.5">Progress</p>
          <p className="text-xl font-bold text-green-400">{revealedCells.size}/{width * height}</p>
        </div>
      </div>

      {/* The Grid */}
      <div 
        className={`
          grid gap-2 bg-[#0a0a14] p-4 rounded-2xl border transition-all duration-300 shadow-2xl
          ${guessFeedback === 'correct' ? 'border-green-500 ring-4 ring-green-500/30 shadow-[0_0_40px_rgba(34,197,94,0.4)] scale-[1.02]' : ''}
          ${guessFeedback === 'incorrect' ? 'border-red-500 ring-4 ring-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.4)] translate-x-1' : ''}
          ${!guessFeedback ? 'border-white/10 scale-100 translate-x-0' : ''}
        `}
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

                {/* The Tooltip */}
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

      {/* Rewards — single source of truth is games/puzzle.js queuePuzzleRewards.
          If the reward shape changes there, update this panel to match. */}
      <div className="w-full max-w-lg p-4 bg-[#0a0a14] border border-green-500/20 rounded-2xl">
        <p className="text-xs font-bold text-green-400 uppercase tracking-wider mb-3">Rewards</p>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="shrink-0">🎯</span>
            <p className="text-white/70 text-xs leading-relaxed">
              <strong className="text-white">+{PUZZLE_PARTICIPATION_STREAK}</strong> streak score per player.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="shrink-0">💎</span>
            <p className="text-white/70 text-xs leading-relaxed">
              <strong className="text-white">{pointsAward.toLocaleString()}</strong> pack points per player
              <span className="text-white/40">
                {' '}({width}×{height} grid · {PUZZLE_POINTS_PER_TILE} pts/tile)
              </span>
            </p>
          </div>
        </div>
        <p className="text-[10px] text-white/40 italic mt-3">
          Paid out all at once when the puzzle closes — either on solve or at the end of the week,
          whichever comes first. Only players who guess at least once receive rewards.
        </p>
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
              const revealedCount = Number(state.revealedCounts?.[emote.id]) || 0;
              const totalCount = Number(state.emoteCounts?.[emote.id]) || 0;
              const isMaxRevealed = totalCount > 0 && revealedCount >= totalCount;
              
              const isIncorrect = incorrectEmotes.has(emote.id) || isMaxRevealed;
              const isSpinning = isGuessing === emote.id;
              const noGuessesLeft = remaining <= 0;

              return (
                <button
                  key={emote.id}
                  disabled={isIncorrect || state.solved || !!isGuessing || noGuessesLeft}
                  onClick={() => handleGuess(emote.id)}
                  title={emote.name}
                  className={`
                    relative w-10 h-10 rounded-lg flex items-center justify-center border transition-all shrink-0
                    ${isIncorrect || noGuessesLeft
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
              Each player has <strong className="text-white">{PUZZLE_BASE_GUESSES}</strong> guesses +<strong className="text-white">{PUZZLE_GUESSES_PER_DAY}</strong> per day.
            </p>
          </>
        )}
      </div>

    </div>
  );
}
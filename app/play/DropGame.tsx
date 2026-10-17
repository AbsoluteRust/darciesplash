'use client';

import { useState, useEffect } from 'react';

export default function DropGame({ state, isFocused }: { state: any, isFocused: boolean }) {
  const [guessed, setGuessed] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  // Check if the round is currently active or already completed
  // The bot doesn't currently send an "active" flag for drops, but we can infer it
  // if the winners array has items and the guesses array matches the participants.
  // For simplicity, we'll just show the UI to guess unless they already guessed.

  const handleGuess = async (emoteId: string) => {
    if (!isFocused || guessed) return;
    const res = await fetch('/api/games/guess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoteId, game: 'drop' }),
    });
    const data = await res.json();
    if (data.ok) {
      setGuessed(true);
      if (data.isCorrect) alert('Correct! You won the card!');
      else alert('Incorrect guess!');
    } else {
      alert(data.error);
    }
  };

  // Simple countdown to when the next drop *might* happen (24-36h from startedAt)
  useEffect(() => {
    if (!state.startedAt) return;
    const timer = setInterval(() => {
      const now = Date.now();
      const end = state.startedAt + (24 * 60 * 60 * 1000); // 24h fallback
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft('Next drop soon...');
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff / 1000 / 60) % 60);
      setTimeLeft(`${h}h ${m}m`);
    }, 1000);
    return () => clearInterval(timer);
  }, [state.startedAt]);

  const isCompleted = state.winners && state.winners.length > 0;

  return (
    <div className="w-full flex flex-col items-center gap-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-white mb-2">{state.cardName || 'Unknown Card'}</h3>
        <p className="text-sm font-bold tracking-widest uppercase" style={{ color: '#a0a0c0' }}>
          {state.rarity} Drop
        </p>
      </div>

      <div className="flex gap-3">
        {(state.optionEmotes || []).map((emote: any) => (
          <button
            key={emote.id}
            onClick={() => handleGuess(emote.id)}
            disabled={guessed || !isFocused || isCompleted}
            className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/20 hover:scale-110 transition disabled:opacity-50"
          >
            <img 
              src={`https://cdn.discordapp.com/emojis/${emote.id}.${emote.animated ? 'gif' : 'png'}`} 
              className="w-12 h-12" 
            />
          </button>
        ))}
      </div>
      
      {isCompleted ? (
        <div className="text-center mt-4">
          <p className="text-green-400 font-bold mb-2">This drop has ended!</p>
          <p className="text-white/60 text-sm">Winners: {state.winners.map((id: string) => `<@${id}>`).join(', ')}</p>
        </div>
      ) : guessed ? (
        <p className="text-indigo-300 mt-4 animate-pulse">Waiting for the drop to end to reveal the winner...</p>
      ) : (
        <p className="text-cyan-400 font-mono mt-4">Next drop in: {timeLeft || '...'}</p>
      )}
    </div>
  );
}
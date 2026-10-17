'use client';

import { useState } from 'react';

export default function DropGame({ state, isFocused }: { state: any, isFocused: boolean }) {
  const [guessed, setGuessed] = useState(false);

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
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-white mb-2">{state?.cardName || 'Unknown Card'}</h3>
        <p className="text-sm text-indigo-300">{state?.rarity || 'Rare'}</p>
      </div>

      <div className="flex gap-3">
        {(state?.optionIds || []).map((id: string) => (
          <button
            key={id}
            onClick={() => handleGuess(id)}
            disabled={guessed || !isFocused}
            className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/20 hover:scale-110 transition disabled:opacity-50"
          >
            <img 
              src={`https://cdn.discordapp.com/emojis/${id}.png`} 
              className="w-12 h-12" 
            />
          </button>
        ))}
      </div>
      
      {guessed && (
        <p className="text-indigo-300 mt-4 animate-pulse">Waiting for the drop to end to reveal the winner...</p>
      )}
    </div>
  );
}
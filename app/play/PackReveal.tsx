'use client';

import { useState } from 'react';
import type { PackCard } from './PlayButton';
import ProfileCard from '@/components/ProfileCard';

export default function PackReveal({
  cards,
  onClose,
}: {
  cards: PackCard[];
  onClose: () => void;
}) {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());

  const flip = (i: number) =>
    setFlipped(prev => {
      const next = new Set(prev);
      next.add(i);
      return next;
    });

  const flipAll = () => setFlipped(new Set(cards.map((_, i) => i)));

  const revealedCount = flipped.size;
  const totalCount = cards.length;
  const allRevealed = revealedCount === totalCount;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-[#181820]/95 backdrop-blur p-6 overflow-y-auto">
      <h2 className="text-2xl font-bold text-white text-center">
        {allRevealed
          ? '🎉 Your pack!'
          : `Tap each card to reveal (${revealedCount}/${totalCount})`}
      </h2>

      <div className="flex flex-wrap justify-center gap-4 max-w-6xl">
        {cards.map((card, i) => (
          <FlipCard
            key={i}
            card={card}
            flipped={flipped.has(i)}
            onFlip={() => flip(i)}
          />
        ))}
      </div>

      <div className="flex gap-3">
        {!allRevealed && (
          <button
            type="button"
            onClick={flipAll}
            className="rounded-lg bg-white/10 px-5 py-2.5 font-semibold text-white hover:bg-white/20 transition"
          >
            Reveal all
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-500 transition"
        >
          {allRevealed ? 'Done' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

function FlipCard({
  card,
  flipped,
  onFlip,
}: {
  card: PackCard;
  flipped: boolean;
  onFlip: () => void;
}) {
  return (
    <div className="w-[140px] sm:w-[160px] md:w-[180px]">
      <button
        type="button"
        onClick={onFlip}
        disabled={flipped}
        className="block w-full [perspective:1000px] outline-none group"
        aria-label={flipped ? card.name : 'Reveal card'}
      >
        <div className="relative aspect-[3/4] w-full">
          <div
            className={`absolute inset-0 transition-transform duration-500 ease-out [transform-style:preserve-3d] ${
              flipped ? '[transform:rotateY(180deg)]' : ''
            }`}
          >
            {/* Back */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 flex items-center justify-center [backface-visibility:hidden] shadow-xl ring-1 ring-white/20 group-hover:ring-white/50 transition">
              <span className="text-5xl font-black text-white/80 select-none">?</span>
            </div>

            {/* Front */}
            <div
              className="absolute inset-0 rounded-2xl bg-zinc-900 [transform:rotateY(180deg)] [backface-visibility:hidden] overflow-hidden"
              style={{ boxShadow: `0 0 28px ${card.color}66` }}
            >
              {/* 
                This wrapper forces ProfileCard to fit exactly inside the FlipCard. 
                pointer-events-none allows clicking the FlipCard button to work.
              */}
              <div className="absolute inset-0 w-full h-full pointer-events-none [&_.pc-card]:!h-full [&_.pc-card]:!max-h-full [&_.pc-card-wrapper]:!h-full">
                <ProfileCard
                  name={card.name}
                  title={card.rarity}
                  handle={card.name.toLowerCase().replace(/\s+/g, '-')}
                  status="Online"
                  contactText="View"
                  avatarUrl={card.rawImageUrl || card.thumbUrl || card.imageUrl}
                  rarity={card.rarity}
                  showUserInfo={false}
                  enableTilt={false}
                  enableMobileTilt={false}
                  behindGlowColor={card.color}
                  iconUrl={null}
                  behindGlowEnabled
                  innerGradient="linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)"
                  isModal={true} // <-- This is the magic prop that stops it from grayscaling the art
                />
              </div>
            </div>
          </div>
        </div>
      </button>

      <div className="mt-3 text-center min-h-[2.5rem]">
        {flipped ? (
          <>
            <div className="text-xs" style={{ color: card.color }}>
              {card.emoji} {card.rarity}
            </div>
            <div className="text-sm font-semibold text-white truncate">{card.name}</div>
          </>
        ) : (
          <div className="text-xs text-white/40">Tap to reveal</div>
        )}
      </div>
    </div>
  );
}
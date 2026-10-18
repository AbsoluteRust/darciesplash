'use client';

import { useState, useEffect } from 'react';
import type { PackCard } from './PlayButton';
import ProfileCard from '@/components/ProfileCard';
import CardInspectModal from './CardInspectModal';

export default function PackReveal({
  cards: initialCards,
  shortId,
  canReroll,
  onClose,
}: {
  cards: PackCard[];
  shortId: string;
  canReroll: boolean;
  onClose: () => void;
}) {
  const [cards, setCards] = useState<PackCard[]>(initialCards);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [hasRerolled, setHasRerolled] = useState(false);
  const [isRerolling, setIsRerolling] = useState(false);
  const [hasRevealedAll, setHasRevealedAll] = useState(false);
  
  const [selectedCard, setSelectedCard] = useState<PackCard | null>(null);

  useEffect(() => {
    if (flipped.size === cards.length && cards.length > 0 && !hasRevealedAll && shortId) {
      setHasRevealedAll(true);
      
      fetch('/api/games/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortId }),
      }).catch(err => console.error('Failed to sync composite to Discord', err));
    }
  }, [flipped.size, cards.length, shortId, hasRevealedAll]);

  const flip = (i: number) =>
    setFlipped(prev => {
      const next = new Set(prev);
      next.add(i);
      return next;
    });

  const flipAll = () => setFlipped(new Set(cards.map((_, i) => i)));

  const handleReroll = async () => {
    if (!shortId) return;
    setIsRerolling(true);
    
    try {
      const res = await fetch('/api/games/reroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortId }),
      });
      const data = await res.json();
      
      if (data.ok && data.cards) {
        setCards(data.cards);
        setFlipped(new Set()); 
        setHasRerolled(true);
        setHasRevealedAll(false); 
      } else {
        alert(data.error || 'Failed to reroll');
      }
    } catch (err) {
      alert('Error communicating with server');
    } finally {
      setIsRerolling(false);
    }
  };

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
            key={`${i}-${card.name}`}
            card={card}
            flipped={flipped.has(i)}
            onFlip={() => flip(i)}
            onInspect={() => setSelectedCard(card)}
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
        
        {canReroll && !hasRerolled && (
          <button
            type="button"
            onClick={handleReroll}
            disabled={isRerolling}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-50"
          >
            {isRerolling ? 'Rerolling...' : '🎲 Reroll for 3 new cards'}
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

      {selectedCard && (
        <CardInspectModal 
          initialCard={selectedCard} 
          onClose={() => setSelectedCard(null)} 
        />
      )}
    </div>
  );
}

function FlipCard({
  card,
  flipped,
  onFlip,
  onInspect,
}: {
  card: PackCard;
  flipped: boolean;
  onFlip: () => void;
  onInspect: () => void;
}) {
  const isWallpaper = card.type === 'Mobile Wallpaper' || card.type === 'Wallpaper';
  const isSplash = card.type === 'Splash Art';
  const isSticker = card.type === 'Sticker';
  const displayType = isWallpaper ? 'Mobile Wallpaper' : isSplash ? 'Splash Art' : isSticker ? 'Sticker' : 'Emote';

  return (
    <div className="w-[140px] sm:w-[160px] md:w-[180px] flex flex-col items-center">
      {flipped ? (
        <div 
          className="w-full relative z-10 animate-in fade-in zoom-in-95 duration-300 cursor-pointer"
          onClick={onInspect}
        >
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
              name={card.name}
              title={displayType}
              handle={card.name.toLowerCase().replace(/\s+/g, '-')}
              status="Online"
              contactText="View"
              avatarUrl={card.rawImageUrl || card.thumbUrl || card.imageUrl}
              rarity={card.rarity}
              showUserInfo={false}
              enableTilt={true}
              enableMobileTilt={false}
              behindGlowColor={card.color}
              iconUrl={null}
              behindGlowEnabled
              innerGradient="linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)"
              isModal={true}
              isWallpaper={isWallpaper}
              isSplash={isSplash}
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onFlip}
          className="block w-full aspect-[3/4] outline-none group transition-transform hover:scale-105 duration-200"
          aria-label="Reveal card"
        >
          <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 flex items-center justify-center shadow-xl ring-1 ring-white/20 group-hover:ring-white/50 transition">
            <span className="text-5xl font-black text-white/80 select-none">?</span>
          </div>
        </button>
      )}

      <div className="mt-3 text-center min-h-[2.5rem]">
        {flipped ? (
          <>
            <div className="text-xs" style={{ color: card.color }}>
              {card.emoji} {card.rarity}
            </div>
            <div className="text-sm font-semibold text-white truncate max-w-[180px]">{card.name}</div>
          </>
        ) : (
          <div className="text-xs text-white/40">Tap to reveal</div>
        )}
      </div>
    </div>
  );
}
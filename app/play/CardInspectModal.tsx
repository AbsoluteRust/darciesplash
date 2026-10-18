'use client';

import { useState, useEffect } from 'react';
import ProfileCard from '@/components/ProfileCard';
import RelatedCardMini from '@/components/RelatedCardMini';

export default function CardInspectModal({ 
  initialCard, 
  onClose 
}: { 
  initialCard: any; 
  onClose: () => void;
}) {
  const [currentCard, setCurrentCard] = useState<any>(initialCard);
  const [activeChroma, setActiveChroma] = useState<any>(null);
  
  const [allCards, setAllCards] = useState<any[]>([]);
  const [allChromas, setAllChromas] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/cards/list').then(r => r.ok ? r.json() : []),
      fetch('/api/chromas/list').then(r => r.ok ? r.json() : []),
    ]).then(([cards, chromas]) => {
      setAllCards(Array.isArray(cards) ? cards : []);
      setAllChromas(Array.isArray(chromas) ? chromas : []);
    }).catch(console.error);
  }, []);

  // Find full metadata for related cards
  const fullCardData = allCards.find(c => c.name.toLowerCase() === currentCard.name.toLowerCase());
  const relatedCardNames = fullCardData?.related || [];
  const relatedCards = relatedCardNames
    .map((name: string) => allCards.find(c => c.name === name))
    .filter(Boolean);

  const chromasForActive = allChromas.filter(
    c => String(c.parent).toLowerCase() === currentCard.name.toLowerCase()
  );

  const isWallpaper = currentCard.type === 'Mobile Wallpaper' || currentCard.type === 'Wallpaper';
  const isSplash = currentCard.type === 'Splash Art';
  const isSticker = currentCard.type === 'Sticker';
  const isEmote = !isWallpaper && !isSplash && !isSticker;
  const imgUrl = currentCard.rawImageUrl || currentCard.thumbUrl || currentCard.image || currentCard.imageUrl;

  useEffect(() => {
    setCurrentCard(initialCard);
  }, [initialCard]);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/80 backdrop-blur-md p-4 pt-10 overflow-y-auto" 
      onClick={onClose}
    >
      <div 
        className="flex flex-col xl:flex-row items-center xl:items-start justify-center gap-6 max-w-7xl w-full pb-10" 
        onClick={e => e.stopPropagation()}
      >
        {/* Left Side: Chromas */}
        {chromasForActive.length > 0 && (
          <div className="flex flex-col gap-2 w-full max-w-[200px] xl:w-auto order-2 xl:order-1 bg-[#181820]/80 p-4 rounded-2xl border border-white/10 h-fit">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 text-center">Chromas</h3>
            <div className="grid grid-cols-3 xl:grid-cols-2 gap-2">
              {chromasForActive.map(ch => (
                <RelatedCardMini
                  key={`${ch.name}|${ch.rarity}`}
                  card={{ name: ch.name, image: ch.image }}
                  onClick={() => setActiveChroma(ch)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Center: Main Card & Info */}
        <div className="flex flex-col items-center gap-4 w-full max-w-sm order-1 xl:order-2 shrink-0">
          <div className="w-full flex justify-center">
            {isEmote ? (
              <ProfileCard
                key={currentCard.name}
                name={currentCard.name}
                title={currentCard.type || 'Emote'}
                handle={currentCard.name.toLowerCase().replace(/\s+/g, '-')}
                status="Online"
                contactText="Close"
                avatarUrl={imgUrl}
                rarity={currentCard.rarity}
                showUserInfo={false}
                enableTilt={true}
                behindGlowColor={currentCard.color || '#fff'}
                iconUrl={null}
                behindGlowEnabled
                innerGradient="linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)"
                isModal={true}
                onContactClick={onClose}
              />
            ) : (
              <div className="flex flex-col items-center gap-4 bg-[#181820] p-4 rounded-2xl border border-white/10 w-full shadow-2xl">
                <img
                  className="max-w-full h-auto max-h-[60vh] object-contain rounded-lg"
                  src={imgUrl}
                  alt={currentCard.name}
                />
                <button onClick={onClose} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-bold transition">
                  Close
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 w-full">
            {(currentCard.description || fullCardData?.description)?.trim() && (
              <div className="bg-[#181820] border border-white/10 p-5 rounded-2xl text-white/90 text-sm leading-relaxed shadow-xl">
                <p>{currentCard.description || fullCardData?.description}</p>
              </div>
            )}
            {((currentCard.details || fullCardData?.details)?.trim() || (currentCard.link || fullCardData?.link)?.trim()) && (
              <div className="bg-[#181820] border border-white/10 p-5 rounded-2xl text-white/90 text-sm leading-relaxed flex flex-col gap-2 shadow-xl">
                {(currentCard.details || fullCardData?.details)?.trim() && (
                  <p>{currentCard.details || fullCardData?.details}</p>
                )}
                {(currentCard.link || fullCardData?.link)?.trim() && (
                  <a 
                    href={currentCard.link || fullCardData?.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-indigo-400 hover:text-indigo-300 underline break-all"
                  >
                    {currentCard.link || fullCardData?.link}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Related Cards */}
        {relatedCards.length > 0 && (
          <div className="flex flex-col gap-2 w-full max-w-[200px] xl:w-auto order-3 bg-[#181820]/80 p-4 rounded-2xl border border-white/10 h-fit">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 text-center">Related</h3>
            <div className="grid grid-cols-3 xl:grid-cols-2 gap-2">
              {relatedCards.map(rc => (
                <RelatedCardMini
                  key={rc.name}
                  card={{ name: rc.name, image: rc.thumbUrl || rc.image }}
                  onClick={() => setCurrentCard(rc)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chroma Lightbox */}
      {activeChroma && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4"
          onClick={(e) => { e.stopPropagation(); setActiveChroma(null); }}
        >
          <div 
            className="relative max-w-3xl w-full flex flex-col items-center gap-4 bg-[#181820] p-6 rounded-2xl border border-white/20"
            onClick={e => e.stopPropagation()}
          >
            <img src={activeChroma.image} alt={activeChroma.name} className="max-h-[70vh] w-auto object-contain rounded-lg" />
            <div className="text-center">
              <div className="text-xl font-bold text-white">{activeChroma.name}</div>
              <div className="text-sm text-white/60">{activeChroma.rarity}</div>
            </div>
            <button onClick={() => setActiveChroma(null)} className="mt-2 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-bold transition">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
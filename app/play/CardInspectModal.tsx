'use client';

import { useState, useEffect } from 'react';
import StandardCard from '@/components/StandardCard';
import RelatedCardMini from '@/components/RelatedCardMini';

function normalizeType(t: string | undefined): string {
  if (!t) return "Emote";
  const n = String(t).toLowerCase().trim();
  const map: Record<string, string> = {
    'emote': 'Emote',
    'splash': 'Splash Art',
    'splash art': 'Splash Art',
    'splashart': 'Splash Art',
    'wallpaper': 'Mobile Wallpaper',
    'mobile wallpaper': 'Mobile Wallpaper',
    'sticker': 'Sticker',
  };
  return map[n] || t;
}

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

  useEffect(() => {
    setCurrentCard(initialCard);
  }, [initialCard]);

  const fullCardData = allCards.find(c => c.name.toLowerCase() === currentCard.name.toLowerCase());
  const relatedCardNames = fullCardData?.related || [];
  const relatedCards = relatedCardNames
    .map((name: string) => allCards.find(c => c.name === name))
    .filter(Boolean);

  const chromasForActive = allChromas.filter(
    c => String(c.parent).toLowerCase() === currentCard.name.toLowerCase()
  );

  // Fallback to the database if the drop/pack data is missing properties
  const effectiveType = currentCard.type || fullCardData?.type || 'Emote';
  const normType = normalizeType(effectiveType);
  const isEmote = normType === "Emote";
  
  // Robust image fallback
  const imgUrl = currentCard.rawImageUrl || currentCard.thumbUrl || currentCard.image || currentCard.imageUrl || fullCardData?.thumbUrl || fullCardData?.image;

  return (
    <div className="emote-modal-overlay" onClick={onClose}>
      <div
        className="emote-modal emote-layout"
        onClick={e => e.stopPropagation()}
      >
        {isEmote ? (
          <div className="w-full max-w-[420px] mx-auto block">
            <StandardCard
              key={currentCard.name}
              name={currentCard.name}
              title="Emote"
              image={imgUrl}
              thumbUrl={imgUrl}
              rarity={currentCard.rarity || fullCardData?.rarity}
              collection={currentCard.collection || fullCardData?.collection}
              glow={currentCard.color}
              isPlay={true}
              isModal={true}
              onClick={onClose}
              enableTilt={false}
            />
          </div>
        ) : (
          <div className="art-layout">
            <img className="full-wallpaper" src={imgUrl} alt={currentCard.name} />
          </div>
        )}

        <div className="emote-info-boxes">
          {(currentCard.description || fullCardData?.description)?.trim() && (
            <div className="emote-info-box">
              <p>{currentCard.description || fullCardData?.description}</p>
            </div>
          )}
          {((currentCard.details || fullCardData?.details)?.trim() || (currentCard.link || fullCardData?.link)?.trim()) && (
            <div className="emote-info-box">
              {(currentCard.details || fullCardData?.details)?.trim() && (
                <p>{currentCard.details || fullCardData?.details}</p>
              )}
              {(currentCard.link || fullCardData?.link)?.trim() && (
                <a 
                  href={currentCard.link || fullCardData?.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="emote-link"
                >
                  {currentCard.link || fullCardData?.link}
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chroma Sidebar (Desktop) */}
      {chromasForActive.length > 0 && (
        <div
          className="chroma-panel"
          onClick={e => e.stopPropagation()}
          onWheel={e => e.stopPropagation()}
        >
          <div className="chroma-panel__label">Chromas</div>
          <div className="chroma-panel__grid">
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

      {/* Related Sidebar (Desktop) */}
      {relatedCards.length > 0 && (
        <div
          className="related-panel"
          onClick={e => e.stopPropagation()}
          onWheel={e => e.stopPropagation()}
        >
          <div className="related-panel__label">Related</div>
          <div className="related-panel__grid">
            {relatedCards.map(rc => (
              <RelatedCardMini
                key={rc.name}
                card={rc}
                onClick={() => setCurrentCard(rc)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Chroma Lightbox */}
      {activeChroma && (
        <div
          className="chroma-lightbox"
          onClick={(e) => { e.stopPropagation(); setActiveChroma(null); }}
        >
          <div
            className="chroma-lightbox__inner"
            onClick={e => e.stopPropagation()}
          >
            <img src={activeChroma.image} alt={activeChroma.name} />
            <div className="chroma-lightbox__name">{activeChroma.name}</div>
            <div className="chroma-lightbox__rarity">{activeChroma.rarity}</div>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import { motion } from 'motion/react';
import ProfileCard from '@/components/ProfileCard';

export default function MiniPackReveal({ cards, onDone }: { cards: any[], onDone: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full pb-10">
      <h2 className="text-2xl font-bold text-white mb-6">Mini Pack Opened!</h2>
      <div className="flex gap-4 flex-wrap justify-center">
        {cards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 50, rotateY: 180 }}
            animate={{ opacity: 1, y: 0, rotateY: 0 }}
            transition={{ delay: i * 0.3, duration: 0.5 }}
            className="w-[140px] sm:w-[160px]"
          >
            <ProfileCard
              name={card.name}
              title={card.type || 'Emote'}
              handle={card.name.toLowerCase().replace(/\s+/g, '-')}
              status="Online"
              contactText="View"
              avatarUrl={card.thumbUrl || card.image}
              rarity={card.rarity}
              showUserInfo={false}
              enableTilt={true}
              behindGlowColor="#fff"
              iconUrl={null}
              behindGlowEnabled
              innerGradient="linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)"
              isModal={true}
            />
          </motion.div>
        ))}
      </div>
      <button
        onClick={onDone}
        className="mt-8 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition"
      >
        Done
      </button>
    </div>
  );
}
'use client';

import { signIn } from 'next-auth/react';
import { useRarityMode, type RarityMode } from './RarityModeContext';
import { useCollectionFilter } from './CollectionFilterContext';

const OPTIONS: {
  value: RarityMode;
  label: string;
  title?: string;
}[] = [
  { value: 'global', label: '🌏', title: 'Show global rarity on cards' },
  { value: 'off', label: 'Off', title: 'Hide rarity borders' },
];

export default function RarityModeToggle() {
  const { mode, setMode } = useRarityMode();
  const { showMine, setShowMine, isSignedIn } = useCollectionFilter();

  const handleLockClick = () => {
    if (isSignedIn === null) return; // still loading

    if (!isSignedIn) {
      // Direct to Discord — no intermediate /signin page.
      // callbackUrl sends the user back to where they were after auth.
      signIn('discord', { callbackUrl: window.location.href });
      return;
    }

    setShowMine(!showMine);
  };

  const lockActive = isSignedIn === true && showMine;
  const lockDisabled = isSignedIn === null;

  return (
    <div className="flex items-center rounded-full border border-white/15 bg-black/40 backdrop-blur-md p-0.5 text-[11px]">
      {OPTIONS.map(opt => {
        const active = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            title={opt.title}
            onClick={() => setMode(opt.value)}
            className={`px-2.5 py-1 rounded-full transition font-medium tracking-wide ${
              active
                ? 'bg-white/90 text-black'
                : 'text-white/60 hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        );
      })}

      <span className="w-px h-4 bg-white/15 mx-0.5" aria-hidden="true" />

      <button
        type="button"
        onClick={handleLockClick}
        disabled={lockDisabled}
        title={
          isSignedIn === false
            ? 'Sign in with Discord to see your collection'
            : lockActive
            ? 'Showing only your collection — click to show all'
            : 'Show only your collection'
        }
        className={`px-2.5 py-1 rounded-full transition font-medium tracking-wide ${
          lockActive
            ? 'bg-white/90 text-black'
            : isSignedIn === false
            ? 'text-white/60 hover:text-white'
            : lockDisabled
            ? 'text-white/25 cursor-not-allowed'
            : 'text-white/60 hover:text-white'
        }`}
      >
        {lockActive ? '🔓' : '🔒'}
      </button>
    </div>
  );
}
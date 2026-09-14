'use client';
import { useRarityMode, type RarityMode } from './RarityModeContext';

const OPTIONS: {
    value: RarityMode;
    label: string;
    disabled?: boolean;
    title?: string;
}[] = [
    { value: 'global', label: 'Global' },
    { value: 'off', label: 'Off' },
    {
        value: 'personal',
        label: 'Personal',
        disabled: true,
        title: 'Coming soon — sign in with Discord to unlock',
    },
];

export default function RarityModeToggle() {
    const { mode, setMode } = useRarityMode();

    return (
        <div className="flex items-center rounded-full border border-white/15 bg-black/40 backdrop-blur-md p-0.5 text-xs">
            {OPTIONS.map(opt => {
                const active = mode === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        disabled={opt.disabled}
                        title={opt.title}
                        onClick={() => !opt.disabled && setMode(opt.value)}
                        className={`px-3 py-1 rounded-full transition font-medium tracking-wide ${
                            active
                                ? 'bg-white/90 text-black'
                                : opt.disabled
                                ? 'text-white/30 cursor-not-allowed'
                                : 'text-white/70 hover:text-white'
                        }`}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}
'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type RarityMode = 'global' | 'off' | 'personal';

interface RarityModeContextValue {
    mode: RarityMode;
    setMode: (mode: RarityMode) => void;
}

const RarityModeContext = createContext<RarityModeContextValue | null>(null);

const STORAGE_KEY = 'rarity-mode';

export function RarityModeProvider({ children }: { children: ReactNode }) {
    const [mode, setModeState] = useState<RarityMode>('global');

    // Hydrate from localStorage on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'global' || stored === 'off' || stored === 'personal') {
            setModeState(stored);
        }
    }, []);

    const setMode = (next: RarityMode) => {
        setModeState(next);
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, next);
        }
    };

    return (
        <RarityModeContext.Provider value={{ mode, setMode }}>
            {children}
        </RarityModeContext.Provider>
    );
}

export function useRarityMode() {
    const ctx = useContext(RarityModeContext);
    if (!ctx) {
        // Fallback: no provider → behave like Global, ignore writes
        return { mode: 'global' as RarityMode, setMode: () => {} };
    }
    return ctx;
}
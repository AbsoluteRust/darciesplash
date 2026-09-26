'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Ctx = {
  showMine: boolean;
  setShowMine: (v: boolean) => void;
  isSignedIn: boolean | null; // null while loading
};

const CollectionFilterContext = createContext<Ctx | null>(null);

export function CollectionFilterProvider({ children }: { children: ReactNode }) {
  const [showMine, setShowMine] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/me', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (!cancelled) setIsSignedIn(!!d.signedIn); })
      .catch(() => { if (!cancelled) setIsSignedIn(false); });
    return () => { cancelled = true; };
  }, []);

  // If the user signs out, drop them out of "my collection" mode.
  useEffect(() => {
    if (isSignedIn === false) setShowMine(false);
  }, [isSignedIn]);

  return (
    <CollectionFilterContext.Provider value={{ showMine, setShowMine, isSignedIn }}>
      {children}
    </CollectionFilterContext.Provider>
  );
}

export function useCollectionFilter() {
  const ctx = useContext(CollectionFilterContext);
  if (!ctx) throw new Error('useCollectionFilter must be used inside CollectionFilterProvider');
  return ctx;
}
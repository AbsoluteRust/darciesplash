'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type AccountRoles = {
  commissioner: boolean;
  darsubscribbler: boolean;
};

type Ctx = {
  showMine: boolean;
  setShowMine: (v: boolean) => void;
  isSignedIn: boolean | null;
  userId: string | null;
  roles: AccountRoles | null;
};

const CollectionFilterContext = createContext<Ctx | null>(null);

export function CollectionFilterProvider({ children }: { children: ReactNode }) {
  const [showMine, setShowMine] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [roles, setRoles] = useState<AccountRoles | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/me', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        setIsSignedIn(!!d.signedIn);
        if (d.signedIn) {
          setUserId(d.user?.id ?? null);
          setRoles(d.roles ?? null);
        } else {
          setUserId(null);
          setRoles(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsSignedIn(false);
          setUserId(null);
          setRoles(null);
        }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (isSignedIn === false) setShowMine(false);
  }, [isSignedIn]);

  return (
    <CollectionFilterContext.Provider value={{ showMine, setShowMine, isSignedIn, userId, roles }}>
      {children}
    </CollectionFilterContext.Provider>
  );
}

export function useCollectionFilter() {
  const ctx = useContext(CollectionFilterContext);
  if (!ctx) throw new Error('useCollectionFilter must be used inside CollectionFilterProvider');
  return ctx;
}
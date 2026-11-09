// lib/emoteLookup.ts
'use client';

import { useEffect, useState } from 'react';

export type EmoteLookup = Record<string, { id: string; animated: boolean }>;

let cache: EmoteLookup | null = null;
let pending: Promise<EmoteLookup> | null = null;

async function fetchLookup(): Promise<EmoteLookup> {
  if (cache) return cache;
  if (pending) return pending;
  pending = fetch('/api/emotes/lookup', { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : {}))
    .catch(() => ({}))
    .then(data => {
      cache = data;
      pending = null;
      return data;
    });
  return pending;
}

export function useEmoteLookup(): EmoteLookup {
  const [lookup, setLookup] = useState<EmoteLookup>(() => cache || {});
  useEffect(() => {
    if (cache) { setLookup(cache); return; }
    let cancelled = false;
    fetchLookup().then(data => { if (!cancelled) setLookup(data); });
    return () => { cancelled = true; };
  }, []);
  return lookup;
}
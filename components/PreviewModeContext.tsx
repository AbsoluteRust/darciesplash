// components/PreviewModeContext.tsx
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';

type PreviewModeContextValue = {
  isRealAdmin: boolean;
  isRealDarsubscriber: boolean;
  adminViewEnabled: boolean;
  subscribblerViewEnabled: boolean;
  effectiveIsAdmin: boolean;
  effectiveIsDarsubscriber: boolean;
  setAdminView: (on: boolean) => void;
  setSubscribblerView: (on: boolean) => void;
};

const Ctx = createContext<PreviewModeContextValue | null>(null);

const useIsoLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Wraps the app to provide client-side preview toggles for admins.
 *
 * The toggles only affect what UI is rendered — they do NOT bypass server
 * permissions. If an admin previews "subscriber" while not actually being
 * one, subscriber-only features appear unlocked, but any save attempt will
 * still be rejected by the real auth check on the API routes.
 *
 * Initial values come from the server (via layout.tsx) so there's no flash
 * of the wrong state on first paint. Overrides are read from localStorage
 * in a layout effect that runs before the browser paints.
 */
export function PreviewModeProvider({
  userId,
  initialIsRealAdmin,
  initialIsRealDarsubscriber,
  children,
}: {
  userId: string | null;
  initialIsRealAdmin: boolean;
  initialIsRealDarsubscriber: boolean;
  children: React.ReactNode;
}) {
  // Toggle state. Defaults match the user's real state so SSR and first
  // client render agree — no hydration warnings.
  const [adminViewEnabled, setAdminViewEnabled] = useState(initialIsRealAdmin);
  const [subscribblerViewEnabled, setSubscribblerViewEnabled] = useState(initialIsRealDarsubscriber);

  // localStorage keys are scoped per-user so an admin's preview settings
  // don't leak if another admin signs in on the same browser.
  const adminKey = userId ? `folly:preview:admin:${userId}` : 'folly:preview:admin';
  const subKey = userId ? `folly:preview:sub:${userId}` : 'folly:preview:sub';

  // Read overrides from localStorage before paint to avoid the flash.
  useIsoLayoutEffect(() => {
    try {
      const storedAdmin = window.localStorage.getItem(adminKey);
      if (storedAdmin === '0') setAdminViewEnabled(false);
      else if (storedAdmin === '1') setAdminViewEnabled(true);

      const storedSub = window.localStorage.getItem(subKey);
      if (storedSub === '0') setSubscribblerViewEnabled(false);
      else if (storedSub === '1') setSubscribblerViewEnabled(true);
    } catch {
      // localStorage unavailable — keep defaults
    }
  }, [adminKey, subKey]);

  const setAdminView = useCallback((on: boolean) => {
    setAdminViewEnabled(on);
    try { window.localStorage.setItem(adminKey, on ? '1' : '0'); } catch {}
  }, [adminKey]);

  const setSubscribblerView = useCallback((on: boolean) => {
    setSubscribblerViewEnabled(on);
    try { window.localStorage.setItem(subKey, on ? '1' : '0'); } catch {}
  }, [subKey]);

  // Admins can preview either state freely. Non-admins use their real state
  // (they never see the toggles anyway, but this guards against anyone who
  // manually pokes localStorage).
  const effectiveIsAdmin = initialIsRealAdmin && adminViewEnabled;
  const effectiveIsDarsubscriber = initialIsRealAdmin
    ? subscribblerViewEnabled
    : initialIsRealDarsubscriber;

  return (
    <Ctx.Provider
      value={{
        isRealAdmin: initialIsRealAdmin,
        isRealDarsubscriber: initialIsRealDarsubscriber,
        adminViewEnabled,
        subscribblerViewEnabled,
        effectiveIsAdmin,
        effectiveIsDarsubscriber,
        setAdminView,
        setSubscribblerView,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function usePreviewMode(): PreviewModeContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Safe fallback for components used outside the provider
    // (e.g. in isolation during tests). Every check resolves to "not
    // subscribed / not admin", which matches the least-privileged view.
    return {
      isRealAdmin: false,
      isRealDarsubscriber: false,
      adminViewEnabled: false,
      subscribblerViewEnabled: false,
      effectiveIsAdmin: false,
      effectiveIsDarsubscriber: false,
      setAdminView: () => {},
      setSubscribblerView: () => {},
    };
  }
  return ctx;
}
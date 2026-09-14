'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

const PageLoadingContext = createContext<{
  loading: boolean;
  setLoading: (v: boolean) => void;
}>({ loading: false, setLoading: () => {} });

export function PageLoadingProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(false);
  return (
    <PageLoadingContext.Provider value={{ loading, setLoading }}>
      {children}
    </PageLoadingContext.Provider>
  );
}

export function usePageLoading() {
  return useContext(PageLoadingContext);
}
'use client';

import { createContext, useContext } from 'react';
import { useAtproto } from '@/hooks/use-atproto';

type AtprotoContextType = ReturnType<typeof useAtproto>;

const AtprotoContext = createContext<AtprotoContextType | null>(null);

export function AtprotoProvider({ children }: { children: React.ReactNode }) {
  const atproto = useAtproto();

  return (
    <AtprotoContext.Provider value={atproto}>
      {children}
    </AtprotoContext.Provider>
  );
}

export function useAtprotoContext(): AtprotoContextType {
  const ctx = useContext(AtprotoContext);
  if (!ctx) throw new Error('useAtprotoContext must be used within AtprotoProvider');
  return ctx;
}

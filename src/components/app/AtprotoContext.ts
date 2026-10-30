import { createContext, useContext } from 'react';
import type { useAtproto } from '@/hooks/use-atproto';

export type AtprotoContextType = ReturnType<typeof useAtproto> & {
  /** Open the one sign-in sheet. */
  openSignIn: () => void;
};

export const AtprotoContext = createContext<AtprotoContextType | null>(null);

export function useAtprotoContext(): AtprotoContextType {
  const ctx = useContext(AtprotoContext);
  if (!ctx) throw new Error('useAtprotoContext must be used within AtprotoProvider');
  return ctx;
}

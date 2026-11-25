import { useMemo } from 'react';
import type { User } from '@/lib/data';
import { MENU_LENGTH, scoreDrinks, type ScoredDrink } from '@/lib/menu-rank';
import type { PourRecord } from '@/lib/atproto/records';

/**
 * Your menu, from your coordinate, aversions and pours (`scoreDrinks`).
 * `distance` is how far each drink still on offer sits from you; `menu` is the top eight.
 */
export function useMenu(user: User, vibeTags: Record<string, number> | undefined, history: PourRecord[]) {
  const scored = useMemo(() => scoreDrinks(user, vibeTags, history), [user, vibeTags, history]);
  const menu = useMemo((): ScoredDrink[] => scored.slice(0, MENU_LENGTH), [scored]);
  const distance = useMemo(() => Object.fromEntries(scored.map((d) => [d.name, d.distance])), [scored]);
  return { scored, menu, distance };
}

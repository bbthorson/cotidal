import { useMemo } from 'react';
import type { Drink, User } from '@/lib/data';
import { MENU_LENGTH, diversifyMenu, scoreDrinks, type ScoredDrink } from '@/lib/menu-rank';
import type { PourRecord } from '@/lib/atproto/records';

export type DrinkTypeFilter = 'all' | Drink['type'];

/**
 * Your menu, from your coordinate, aversions, EKF tolerances, and pours
 * (`scoreDrinks`). `closeness` scores every drink still on offer; `menu` is
 * the diversified top eight (filtered by drink type when chosen).
 */
export function useMenu(
  user: User,
  vibeTags: Record<string, number> | undefined,
  history: PourRecord[],
  typeFilter: DrinkTypeFilter = 'all'
) {
  const scored = useMemo(() => scoreDrinks(user, vibeTags, history), [user, vibeTags, history]);
  const menu = useMemo((): ScoredDrink[] => {
    const filtered = typeFilter === 'all' ? scored : scored.filter((d) => d.type === typeFilter);
    return diversifyMenu(filtered, MENU_LENGTH, { anchorsOnly: typeFilter === 'all' });
  }, [scored, typeFilter]);
  const closeness = useMemo(() => Object.fromEntries(scored.map((d) => [d.name, d.score])), [scored]);
  return { scored, menu, closeness };
}

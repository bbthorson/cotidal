import { useMemo } from 'react';
import type { User } from '@/lib/drinks/data';
import { MENU_LENGTH, scoreDrinks, type ScoredDrink, type TerrainStart } from '@/lib/drinks/menu-rank';
import type { PourRecord } from '@/lib/atproto/records';

/**
 * Your menu, from your terrain (where the questions put you, `start`, and
 * every pour since), your aversions and the quiz's tags (`scoreDrinks`).
 * `distance` is how far each drink still on offer sits from your point; `menu`
 * is the top eight. With no quiz to read, your point stands in for its start.
 */
export function useMenu(
  user: User & { variance?: { x: number; y: number } },
  vibeTags: Record<string, number> | undefined,
  history: PourRecord[],
  start: TerrainStart | null
) {
  const scored = useMemo(
    () => scoreDrinks(user, vibeTags, history, start ?? undefined),
    [user, vibeTags, history, start]
  );
  const menu = useMemo((): ScoredDrink[] => scored.slice(0, MENU_LENGTH), [scored]);
  const distance = useMemo(() => Object.fromEntries(scored.map((d) => [d.name, d.distance])), [scored]);
  return { scored, menu, distance };
}

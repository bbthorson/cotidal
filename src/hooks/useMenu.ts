import { useMemo } from 'react';
import { drinkDatabase, type Drink, type User } from '@/lib/data';
import { calculateWeightedRelevance } from '@/lib/scoring';
import type { PourRecord } from '@/lib/atproto/records';

export type ScoredDrink = Drink & { score: number };

/** The menu: the top pick and seven more. */
export const MENU_LENGTH = 8;

/**
 * Your menu, from your coordinate, aversions and pours: the one ranking, so
 * Compass (which lists it) and Log (whose map fills it in) cannot disagree.
 * `closeness` scores every drink still on offer; `menu` is the top eight.
 */
export function useMenu(user: User, vibeTags: Record<string, number> | undefined, history: PourRecord[]) {
  // Filter, then score by weighted relevance (coordinate, vibe, history).
  const scored = useMemo(() => {
    const dislikesSmoke = user.filters.includes('noSmoke');
    const dislikesBitter = user.filters.includes('noBitter');
    const dislikesAnise = user.filters.includes('noAnise');

    const logs = history.map((pour) => ({
      drinkName: pour.drink.name,
      location: pour.isHomePour ? 'Home Pour' : pour.venue?.entity?.name,
      hedonicScale: pour.rating.hedonic,
      createdAt: pour.createdAt,
    }));

    return drinkDatabase
      .filter((d) => !(dislikesSmoke && d.hasSmoke) && !(dislikesBitter && d.isBitter) && !(dislikesAnise && d.hasAnise))
      .filter((drink) => {
        // A drink you rated 3 or lower last time comes off the menu.
        const latest = logs
          .filter((log) => log.drinkName.toLowerCase() === drink.name.toLowerCase())
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        return !(latest && latest.hedonicScale <= 3);
      })
      .map((drink) => ({
        ...drink,
        // No venue here: the venue term is for the harbour, which knows the bar.
        score: calculateWeightedRelevance({ x: user.x, y: user.y, vibeTags: vibeTags || null }, drink, logs, null),
      }))
      .sort((a, b) => b.score - a.score);
  }, [user, vibeTags, history]);

  const menu = useMemo((): ScoredDrink[] => scored.slice(0, MENU_LENGTH), [scored]);
  const closeness = useMemo(() => Object.fromEntries(scored.map((d) => [d.name, d.score])), [scored]);

  return { scored, menu, closeness };
}

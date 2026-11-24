import { drinkDatabase, type Drink } from '@/lib/data';
import { matchDrink } from '@/lib/drink-match';
import { foldName } from '@/lib/pour-history';
import { calculateDistance } from '@/lib/scoring';
import { titleOf, type Register } from '@/lib/register';

/**
 * Finding a drink or a bar by what was typed, and the drinks near a point.
 * Compass's search and the rating sheet's quick picks read these; they hold
 * no state, so the screens only keep what was typed and draw the answer.
 */

/**
 * The drinks a search names, in the order given: by name or alias
 * (`matchDrink`, "Prosecco DOC"), by the register's title, or by what is in
 * them ("mezcal", "lime"). Nothing for an empty search.
 */
export function searchDrinks<T extends { name: string }>(query: string, drinks: T[], register: Register): T[] {
  const q = foldName(query);
  if (!q) return [];
  const named = matchDrink(query)?.name ?? null;
  return drinks.filter(
    (d) =>
      d.name === named ||
      foldName(titleOf(register, d.name)).includes(q) ||
      foldName(register[d.name]?.build ?? '').includes(q)
  );
}

/** The places whose name holds what was typed, case and accents aside. */
export function namesMatching<T extends { name: string }>(query: string, places: T[]): T[] {
  const q = foldName(query);
  return places.filter((p) => foldName(p.name).includes(q));
}

/**
 * A bar to offer by the name typed, when no bar listed has exactly that name:
 * its menu opens all the same. `null` when one does, or nothing was typed.
 */
export function unlistedBar(query: string, ...lists: { name: string }[][]): string | null {
  const q = foldName(query);
  if (!q) return null;
  return lists.some((list) => list.some((b) => foldName(b.name) === q)) ? null : query.trim();
}

/** The drinks nearest a point, nearest first, aversions not considered (ties keep the map's order). */
export function closestDrinks(point: { x: number; y: number }, count: number, drinks: Drink[] = drinkDatabase): Drink[] {
  return [...drinks].sort((a, b) => calculateDistance(point, a) - calculateDistance(point, b)).slice(0, count);
}

/** The other drinks placed at exactly the same point as this one. */
export function drinksAtSameSpot(drink: Drink, drinks: Drink[] = drinkDatabase): Drink[] {
  return drinks.filter((d) => d.name !== drink.name && d.x === drink.x && d.y === drink.y);
}

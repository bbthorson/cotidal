import { drinkDatabase, type Drink } from '@/lib/drinks/data';
import { foldName } from '@/lib/pours/pour-history';
import { calculateDistance } from '@/lib/palate/scoring';
import { titleOf, type Register } from '@/lib/drinks/register';
import { distanceBetween } from '@/lib/map/coordinates';
import { chart } from '@/lib/copy';

/**
 * Matching, searching, and proximity over `drinkDatabase`.
 *
 * Every caller that turns words — a pour, a menu line, a chat assistant's
 * query — into a `Drink` comes through `matchDrink` / `drinkOf`, so names and
 * aliases mean the same drink everywhere.
 */

/** Case, accents, apostrophes, "&" and punctuation folded away. */
export function normalizeName(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** "Daiquiri (Classic)" → "daiquiri". No two drinks share one (tests/unit/drink-match.test.ts). */
export function baseName(name: string): string {
  return normalizeName(name.replace(/\([^)]*\)/g, ' '));
}

/**
 * The drink a name means: its full name, its name without the parenthetical,
 * or one of its `aliases`. Nothing looser, because a menu item matched to the
 * wrong drink would be ranked with confidence it has not earned, and a pour
 * matched to the wrong drink would move the coordinate the wrong way.
 */
export function matchDrink(input: string, drinks: readonly Drink[] = drinkDatabase): Drink | null {
  const wanted = normalizeName(input);
  if (!wanted) return null;
  return (
    drinks.find((d) => normalizeName(d.name) === wanted) ??
    drinks.find((d) => baseName(d.name) === wanted) ??
    drinks.find((d) => d.aliases?.some((a) => normalizeName(a) === wanted)) ??
    null
  );
}

/**
 * The drink a stored reference means — a pour's `drink`, a menu item's — by
 * its `slug` when it carries one the catalog still has, and otherwise by its
 * name (`matchDrink`).
 */
export function drinkOf(ref: { name: string; slug?: string }, drinks: readonly Drink[] = drinkDatabase): Drink | null {
  const bySlug = ref.slug ? drinks.find((d) => d.slug === ref.slug) : undefined;
  return bySlug ?? matchDrink(ref.name, drinks);
}

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

/**
 * A search of the whole library: what is ranked for you first, in its order,
 * then every other drink it finds (one you avoid, or rated low), in the
 * library's. A search finds a drink; it is the menu that leaves some out.
 */
export function searchLibrary<T extends Drink>(query: string, ranked: readonly T[], register: Register, drinks: readonly Drink[] = drinkDatabase): (T | Drink)[] {
  const inRanked = new Set(ranked.map((d) => d.name));
  return [...searchDrinks(query, [...ranked], register), ...searchDrinks(query, drinks.filter((d) => !inRanked.has(d.name)), register)];
}

/** The places whose name holds what was typed, case and accents aside. */
export function namesMatching<T extends { name: string }>(query: string, places: T[]): T[] {
  const q = foldName(query);
  return places.filter((p) => foldName(p.name).includes(q));
}

/**
 * A bar to offer by the name typed, when no bar listed has exactly that name:
 * its menu opens all the same. `null` when one does, when nothing was typed,
 * or when the words found drinks.
 */
export function unlistedBar(query: string, foundDrinks: boolean, ...lists: { name: string }[][]): string | null {
  const q = foldName(query);
  if (!q || foundDrinks) return null;
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

/** Below this, an axis is not worth a word: the drink is level with you on it. */
const LEVEL = 0.5;

/**
 * Which way a drink lies from you and how far, as the chart reads it: the
 * axes' own words ("richer, more savory") and the distance to a tenth.
 */
export function wayTo(from: { x: number; y: number }, to: { x: number; y: number }): { words: string; distance: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const words: string[] = [];
  if (Math.abs(dx) >= LEVEL) words.push(dx < 0 ? chart.way.richer : chart.way.crisper);
  if (Math.abs(dy) >= LEVEL) words.push(dy < 0 ? chart.way.savory : chart.way.sweeter);
  return {
    words: words.length > 0 ? chart.wayOf(words) : chart.way.here,
    distance: distanceBetween(from, to),
  };
}

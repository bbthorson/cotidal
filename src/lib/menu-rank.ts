import { drinkDatabase, type Drink, type Tolerances, type User } from '@/lib/data';
import { baseName, matchDrink } from '@/lib/drink-match';
import { splitMenuLine, suggestClosestDrink } from '@/lib/ingredient-match';
import { byRelevance, relevanceOf, type MinimalDrinkLog, type Relevance } from '@/lib/scoring';
import { titleOf, type Register } from '@/lib/register';
import type { PourRecord } from '@/lib/atproto/records';

/**
 * A menu someone typed or pasted, and the order to have it in. Used by
 * Compass's bar view (a bar's menu, or a menu with no bar); the ranking is
 * the one Compass's own list uses (`relevanceOf`), plus the
 * bar when it is named.
 */

export interface MenuItem {
  /** As typed, or the register's title when it was picked from the map. */
  label: string;
  /** Optional ingredient description parsed from a pasted menu line. */
  description?: string;
  drink: Drink | null;
  /** Closest structural classic when `drink` is null and ingredients give a clear signal. */
  relative?: Drink | null;
}

/** The drink on the map a menu line names: by name or alias (`matchDrink`), or by register title. */
export function placeDrink(label: string, register: Register): Drink | null {
  const want = baseName(label);
  if (!want) return null;
  return matchDrink(label) ?? drinkDatabase.find((d) => baseName(register[d.name]?.title ?? '') === want) ?? null;
}

/** The list with one more line on it: a repeat of a line already there changes nothing. */
export function addMenuLine(items: MenuItem[], entry: string, register: Register): MenuItem[] {
  const { name, description } = splitMenuLine(entry);
  if (!name) return items;
  const drink = placeDrink(name, register);
  const shown = drink ? titleOf(register, drink.name) : name;
  if (items.some((i) => baseName(i.label) === baseName(shown))) return items;
  const relative = !drink && description ? suggestClosestDrink(`${name} ${description}`) : null;
  return [...items, { label: shown, ...(description ? { description } : {}), drink, ...(relative ? { relative } : {}) }];
}

/** Add a multi-line pasted menu block, one drink per line. */
export function addMenuLines(items: MenuItem[], block: string, register: Register): MenuItem[] {
  let next = items;
  for (const raw of block.split(/\r?\n/)) {
    next = addMenuLine(next, raw, register);
  }
  return next;
}

export type ScoredDrink = Drink & Relevance;

/** Your menu: the top pick and seven more. */
export const MENU_LENGTH = 8;

/**
 * Every drink still on offer to you, closest first: your aversions taken
 * off, and a drink you rated 3 or lower last time taken off with them. The
 * one ranking, so Compass's list and the chart it fills in
 * cannot disagree. No venue here: the venue term is for a bar's menu
 * (`rankMenu`), which knows the bar.
 */
export function scoreDrinks(
  user: User,
  vibeTags: Record<string, number> | undefined,
  history: PourRecord[],
  drinks: Drink[] = drinkDatabase
): ScoredDrink[] {
  const dislikesSmoke = user.filters.includes('noSmoke');
  const dislikesBitter = user.filters.includes('noBitter');
  const dislikesAnise = user.filters.includes('noAnise');

  const logs = pourLogs(history);

  return drinks
    .filter((d) => !(dislikesSmoke && d.hasSmoke) && !(dislikesBitter && d.isBitter) && !(dislikesAnise && d.hasAnise))
    .filter((drink) => {
      const latest = logs
        .filter((log) => log.drinkName.toLowerCase() === drink.name.toLowerCase())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      return !(latest && latest.hedonicScale <= 3);
    })
    .map((drink) => ({
      ...drink,
      ...relevanceOf(
        { x: user.x, y: user.y, vibeTags: vibeTags || null, tolerances: user.tolerances ?? null },
        drink,
        logs,
        null
      ),
    }))
    .sort(byRelevance);
}

/** Pours as the scorer reads them: what was rated, where, and when. */
export function pourLogs(pours: PourRecord[]): MinimalDrinkLog[] {
  return pours.map((p) => ({
    drinkName: p.drink.name,
    location: p.isHomePour ? 'Home Pour' : p.venue?.entity?.name,
    hedonicScale: p.rating.hedonic,
    createdAt: p.createdAt,
  }));
}

export interface RankedDrink extends Relevance {
  drink: Drink;
}

/**
 * The menu's placed drinks, closest to you first. `where` is the bar's name,
 * "Home Pour" at home, or null for neither. Lines the map does not know are
 * not ranked: they stay in `items` for the caller to show apart.
 */
export function rankMenu(
  items: MenuItem[],
  you: { x: number; y: number; vibeTags?: Record<string, number> | null; tolerances?: Tolerances | null },
  pours: PourRecord[],
  where: string | null
): RankedDrink[] {
  const logs = pourLogs(pours);
  const placed = [...new Map(items.filter((i) => i.drink).map((i) => [i.drink!.name, i.drink!])).values()];
  return placed
    .map((drink) => ({
      drink,
      ...relevanceOf(
        { x: you.x, y: you.y, vibeTags: you.vibeTags ?? null, tolerances: you.tolerances ?? null },
        drink,
        logs,
        where
      ),
    }))
    .sort(byRelevance);
}

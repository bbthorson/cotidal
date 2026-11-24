import { drinkDatabase, type Drink, type User } from '@/lib/data';
import { baseName, matchDrink } from '@/lib/drink-match';
import { calculateWeightedRelevance, type MinimalDrinkLog } from '@/lib/scoring';
import { titleOf, type Register } from '@/lib/register';
import type { PourRecord } from '@/lib/atproto/records';

/**
 * A menu someone typed, and the order to have it in. Used by Compass's bar
 * view (a bar's menu, or a menu with no bar); the ranking is the one Compass's
 * own list uses (`calculateWeightedRelevance`), plus the bar when it is named.
 */

export interface MenuItem {
  /** As typed, or the register's title when it was picked from the map. */
  label: string;
  drink: Drink | null;
}

/** The drink on the map a menu line names: by name or alias (`matchDrink`), or by register title. */
export function placeDrink(label: string, register: Register): Drink | null {
  const want = baseName(label);
  if (!want) return null;
  return matchDrink(label) ?? drinkDatabase.find((d) => baseName(register[d.name]?.title ?? '') === want) ?? null;
}

/** The list with one more line on it: a repeat of a line already there changes nothing. */
export function addMenuLine(items: MenuItem[], entry: string, register: Register): MenuItem[] {
  const label = entry.trim();
  if (!label) return items;
  const drink = placeDrink(label, register);
  const shown = drink ? titleOf(register, drink.name) : label;
  return items.some((i) => baseName(i.label) === baseName(shown)) ? items : [...items, { label: shown, drink }];
}

export type ScoredDrink = Drink & { score: number };

/** Your menu: the top pick and seven more. */
export const MENU_LENGTH = 8;

/**
 * Every drink still on offer to you, closest first: your aversions taken
 * off, and a drink you rated 3 or lower last time taken off with them. The
 * one ranking, so Compass (which lists it) and Log (whose map fills it in)
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
      score: calculateWeightedRelevance({ x: user.x, y: user.y, vibeTags: vibeTags || null }, drink, logs, null),
    }))
    .sort((a, b) => b.score - a.score);
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

export interface RankedDrink {
  drink: Drink;
  score: number;
}

/**
 * The menu's placed drinks, closest to you first. `where` is the bar's name,
 * "Home Pour" at home, or null for neither. Lines the map does not know are
 * not ranked: they stay in `items` for the caller to show apart.
 */
export function rankMenu(
  items: MenuItem[],
  you: { x: number; y: number; vibeTags?: Record<string, number> | null },
  pours: PourRecord[],
  where: string | null
): RankedDrink[] {
  const logs = pourLogs(pours);
  const placed = [...new Map(items.filter((i) => i.drink).map((i) => [i.drink!.name, i.drink!])).values()];
  return placed
    .map((drink) => ({
      drink,
      score: calculateWeightedRelevance({ x: you.x, y: you.y, vibeTags: you.vibeTags ?? null }, drink, logs, where),
    }))
    .sort((a, b) => b.score - a.score);
}

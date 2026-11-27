import { drinkDatabase, type Drink, type Tolerances, type User } from '@/lib/drinks/data';
import { baseName, drinkOf, matchDrink } from '@/lib/drinks/search';
import {
  extractMenuPrice,
  isNonAlcoholic,
  parseSectionHeader,
  placeDirectional,
  splitMenuLine,
  suggestClosestDrink,
  type DirectionalPlacement,
} from '@/lib/drinks/ingredient-match';
import { byRelevance, DISLIKED_AT, relevanceOf, type MinimalDrinkLog, type Relevance } from '@/lib/palate/scoring';
import { buildTerrain, type TerrainStart } from '@/lib/palate/terrain';
import { titleOf, type Register } from '@/lib/drinks/register';
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
  /** Optional menu section header (`Les Martinis`, `Non-Alcoholic`, etc.). */
  section?: string;
  /** Optional menu price (`$18`) when present on the source line. */
  price?: string;
  /** True when the line or its section indicates a non-alcoholic / zero-proof drink. */
  nonAlcoholic?: boolean;
  drink: Drink | null;
  /** Directional placement from listed ingredients when `drink` is null. */
  directional?: DirectionalPlacement | null;
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
export function addMenuLine(
  items: MenuItem[],
  entry: string,
  register: Register,
  section?: string
): MenuItem[] {
  const price = extractMenuPrice(entry);
  const { name, description } = splitMenuLine(entry);
  if (!name) return items;
  const text = description ? `${name} ${description}` : name;
  const nonAlcoholic = isNonAlcoholic(text, section);
  const drink = nonAlcoholic ? null : placeDrink(name, register);
  const shown = drink ? titleOf(register, drink.name) : name;
  if (items.some((i) => baseName(i.label) === baseName(shown))) return items;
  const directional = !drink && description ? placeDirectional(text, undefined, { section }) : null;
  const relative =
    !drink && description && !nonAlcoholic
      ? (directional?.closestClassic ?? suggestClosestDrink(text, undefined, { section, nonAlcoholic }))
      : null;
  return [
    ...items,
    {
      label: shown,
      ...(description ? { description } : {}),
      ...(section ? { section } : {}),
      ...(price ? { price } : {}),
      ...(nonAlcoholic ? { nonAlcoholic: true } : {}),
      drink,
      ...(directional ? { directional } : {}),
      ...(relative ? { relative } : {}),
    },
  ];
}

/** Add a multi-line pasted menu block, one drink per line (tracking section headers). */
export function addMenuLines(items: MenuItem[], block: string, register: Register): MenuItem[] {
  let next = items;
  let currentSection: string | undefined;
  for (const raw of block.split(/\r?\n/)) {
    const header = parseSectionHeader(raw);
    if (header) {
      currentSection = header;
      continue;
    }
    next = addMenuLine(next, raw, register, currentSection);
  }
  return next;
}

export type ScoredDrink = Drink & Relevance;

/** Your menu: the top pick and seven more. */
export const MENU_LENGTH = 8;

export type { TerrainStart } from '@/lib/palate/terrain';

/** With no quiz to read, your point stands in for where the questions put you. */
const startFrom = (you: { x: number; y: number; variance?: { x: number; y: number } }): TerrainStart => ({
  x: you.x,
  y: you.y,
  ...(you.variance ? { variance: you.variance } : {}),
});

/**
 * Every drink still on offer to you, highest on your terrain first
 * (`relevanceOf`): your aversions taken off, and a drink you rated 3 or
 * lower last time taken off with them. The one ranking, so Compass's list
 * and the chart it fills in cannot disagree. No venue here: the venue term is
 * for a bar's menu (`rankMenu`), which knows the bar.
 *
 * `start` is where the questions put you (`quizStart`); without it, your
 * point stands in for it.
 */
export function scoreDrinks(
  user: User & { variance?: { x: number; y: number } },
  vibeTags: Record<string, number> | undefined,
  history: PourRecord[],
  start: TerrainStart = startFrom(user),
  drinks: Drink[] = drinkDatabase
): ScoredDrink[] {
  const dislikesSmoke = user.filters.includes('noSmoke');
  const dislikesBitter = user.filters.includes('noBitter');
  const dislikesAnise = user.filters.includes('noAnise');

  const logs = pourLogs(history);
  const terrain = buildTerrain(start, history, drinks);

  return drinks
    .filter((d) => !(dislikesSmoke && d.hasSmoke) && !(dislikesBitter && d.isBitter) && !(dislikesAnise && d.hasAnise))
    .filter((drink) => {
      const latest = logs
        .filter((log) => log.drinkName.toLowerCase() === drink.name.toLowerCase())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      return !(latest && latest.hedonicScale <= DISLIKED_AT);
    })
    .map((drink) => ({
      ...drink,
      ...relevanceOf(
        { x: user.x, y: user.y, vibeTags: vibeTags || null, tolerances: user.tolerances ?? null },
        drink,
        logs,
        null,
        terrain
      ),
    }))
    .sort(byRelevance);
}

/** Pours as the scorer reads them: what was rated, where, and when. */
export function pourLogs(pours: PourRecord[]): MinimalDrinkLog[] {
  return pours.map((p) => ({
    // The catalog's name for the drink the pour means, by slug then name: the scorer
    // compares names, and a pour saved as typed ("margarita") is the Tommy's.
    drinkName: drinkOf(p.drink)?.name ?? p.drink.name,
    location: p.isHomePour ? 'Home Pour' : p.venue?.entity?.name,
    hedonicScale: p.rating.hedonic,
    createdAt: p.createdAt,
  }));
}

export interface RankedDrink extends Relevance {
  drink: Drink;
}

/**
 * The menu's placed drinks, highest on your terrain first. `where` is the
 * bar's name, "Home Pour" at home, or null for neither. Lines the map does
 * not know are not ranked: they stay in `items` for the caller to show apart.
 */
export function rankMenu(
  items: MenuItem[],
  you: {
    x: number;
    y: number;
    vibeTags?: Record<string, number> | null;
    tolerances?: Tolerances | null;
    variance?: { x: number; y: number };
  },
  pours: PourRecord[],
  where: string | null,
  start: TerrainStart = startFrom(you)
): RankedDrink[] {
  const logs = pourLogs(pours);
  const terrain = buildTerrain(start, pours);
  const placed = [...new Map(items.filter((i) => i.drink).map((i) => [i.drink!.name, i.drink!])).values()];
  return placed
    .map((drink) => ({
      drink,
      ...relevanceOf(
        { x: you.x, y: you.y, vibeTags: you.vibeTags ?? null, tolerances: you.tolerances ?? null },
        drink,
        logs,
        where,
        terrain
      ),
    }))
    .sort(byRelevance);
}

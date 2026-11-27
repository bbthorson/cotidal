import { drinkDatabase, type Drink } from '../drinks/data';
import { compareTerrains, type MapPoint } from './overlap';
import { DISLIKED_AT } from './scoring';
import { avoids, nearestHilltop } from './taste-reading';
import { drinkHeight, type Height, type Terrain } from './terrain';

/**
 * Pure domain math for `/map`'s unified overlays (`Lens × Scope`):
 * - `intersectGrounds` / `rankForTable` / `widestContrastPair` (Table lens, shared with `/mcp`)
 * - `exploreFrontier` (Uncharted lens, using GP uncertainty `sd`)
 * - `filterDrinksByType` (Drink-type scope filter)
 */

export const DRINK_TYPES = ['Cocktail', 'Wine', 'Beer', 'Spirit'] as const;
export type DrinkType = (typeof DRINK_TYPES)[number];

export interface SampledGround {
  step: number;
  rows: Height[][];
}

export interface TableMember {
  id: string;
  label: string;
  terrain: Terrain;
  aversions: MapPoint['aversions'];
  rated: ReadonlyMap<string, number>;
}

/**
 * Shared high ground for a table of 2–6 people: at every grid cell, the
 * worst-case (minimum) expected rating across the group and maximum
 * uncertainty (`sd`). Draws cleanly as one set of contour lines instead of
 * overlapping spaghetti.
 */
export function intersectGrounds(grounds: readonly SampledGround[]): SampledGround | null {
  if (grounds.length === 0) return null;
  const base = grounds[0];
  if (grounds.length === 1) return base;
  const rows: Height[][] = base.rows.map((row, r) =>
    row.map((cell, c) => {
      let rating = cell.rating;
      let sd = cell.sd;
      for (let k = 1; k < grounds.length; k++) {
        const other = grounds[k].rows[r]?.[c];
        if (!other) continue;
        if (other.rating < rating) rating = other.rating;
        if (other.sd > sd) sd = other.sd;
      }
      return { rating, sd };
    })
  );
  return { step: base.step, rows };
}

/**
 * Minimax group ranking: respects every person's aversions, leaves out
 * anything someone at the table rated low (`<= DISLIKED_AT`), and orders by
 * highest worst-case rating across the group (tie-broken by group mean).
 * Shared by `/map`'s Table overlay and `/mcp`'s `recommend_for_group`.
 */
export function rankForTable(
  people: readonly TableMember[],
  pool: readonly Drink[] = drinkDatabase,
  count?: number
): Drink[] {
  if (people.length === 0) return [];
  const eligible = pool.filter((drink) =>
    people.every(
      (p) => !avoids(drink, p.aversions) && !((p.rated.get(drink.name) ?? Infinity) <= DISLIKED_AT)
    )
  );
  const ranked = eligible
    .map((drink) => {
      const heights = people.map((p) => drinkHeight(p.terrain, drink).rating);
      return {
        drink,
        worst: Math.min(...heights),
        mean: heights.reduce((a, b) => a + b, 0) / heights.length,
      };
    })
    .sort((a, b) => b.worst - a.worst || b.mean - a.mean || a.drink.name.localeCompare(b.drink.name))
    .map(({ drink }) => drink);
  return count !== undefined ? ranked.slice(0, count) : ranked;
}

/** The two people at the table whose maps have the fewest top drinks in common. */
export function widestContrastPair(
  people: readonly TableMember[]
): { first: string; second: string; inCommon: number } | null {
  if (people.length < 2) return null;
  let widest: { first: string; second: string; inCommon: number } | null = null;
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const { inCommon } = compareTerrains(
        { terrain: people[i].terrain, aversions: people[i].aversions },
        { terrain: people[j].terrain, aversions: people[j].aversions }
      );
      if (!widest || inCommon < widest.inCommon) {
        widest = {
          first: people[i].label,
          second: people[j].label,
          inCommon,
        };
      }
    }
  }
  return widest;
}

export interface ExploreFrontier {
  /** Unrated drinks high on your ground with meaningful GP uncertainty (`sd`). */
  nearUntried: Drink[];
  /** Unrated drinks 1.5–4.5 points past your nearest hilltop — a controlled stretch. */
  pastEdge: Drink[];
}

const NEAR_UNTREATED_MIN_RATING = 6.2;
const EDGE_MIN_DIST = 1.5;
const EDGE_MAX_DIST = 4.5;

/**
 * Uncharted exploration lens: surfaces drinks you haven't rated yet, split
 * between high-confidence/uncertain ground near your taste (`nearUntried`)
 * and a controlled stretch just past your nearest hilltop (`pastEdge`).
 */
export function exploreFrontier(
  terrain: Terrain,
  aversions: MapPoint['aversions'],
  rated: ReadonlyMap<string, number>,
  point: { x: number; y: number },
  pool: readonly Drink[] = drinkDatabase,
  limit = 5
): ExploreFrontier {
  const unrated = pool.filter((d) => !rated.has(d.name) && !avoids(d, aversions));

  const scored = unrated.map((drink) => {
    const { rating, sd } = drinkHeight(terrain, drink);
    const hill = nearestHilltop(terrain, drink, point);
    const dist = Math.hypot(drink.x - hill.x, drink.y - hill.y);
    return { drink, rating, sd, dist };
  });

  const nearUntried = scored
    .filter((s) => s.rating >= NEAR_UNTREATED_MIN_RATING)
    .sort((a, b) => (b.rating + b.sd * 0.35) - (a.rating + a.sd * 0.35) || a.drink.name.localeCompare(b.drink.name))
    .slice(0, limit)
    .map((s) => s.drink);

  const nearNames = new Set(nearUntried.map((d) => d.name));

  const pastEdge = scored
    .filter((s) => !nearNames.has(s.drink.name) && s.dist >= EDGE_MIN_DIST && s.dist <= EDGE_MAX_DIST && s.rating >= 5.0)
    .sort((a, b) => b.rating - a.rating || a.dist - b.dist || a.drink.name.localeCompare(b.drink.name))
    .slice(0, limit)
    .map((s) => s.drink);

  return { nearUntried, pastEdge };
}

/** Narrow a drink pool by `Drink['type']` (or return the full pool when `null`). */
export function filterDrinksByType<T extends Pick<Drink, 'type'>>(
  pool: readonly T[],
  type: DrinkType | null
): T[] {
  return type ? pool.filter((d) => d.type === type) : [...pool];
}

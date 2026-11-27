import { drinkDatabase, type Drink } from '../drinks/data';
import { DISLIKED_AT } from './scoring';
import { buildTerrain, evidenceAt, kindOf, peaks, rankByTerrain, type Terrain, type TerrainPour, type TerrainStart } from './terrain';

/**
 * Reading someone's taste from their ground, as the map's card reads yours:
 * their menu, what put a drink where it stands, and which way a drink lies.
 * One set of rules for every place that reads a person — their map
 * (`/p/<handle>`, `/?palate=`) and the chat tools (`src/lib/mcp/`) — so
 * the page and an assistant give the same answer twice.
 *
 * Never a predicted score: a drink is placed by its height, and said by what
 * put it there (docs/map-first.md, What a screen says about a drink).
 */

export type Aversions = { smoke: boolean; bitter: boolean; anise: boolean };

/**
 * Someone's ground: from where their questions put them and every pour they
 * rated, or, with no quiz on record, from their point — as `/` builds yours.
 */
export function terrainOf(start: TerrainStart | null, point: { x: number; y: number }, pours: readonly TerrainPour[]): Terrain {
  return buildTerrain(start ?? { x: point.x, y: point.y }, pours);
}

/** Their latest rating of each drink they poured, by name (pours newest first). */
export function ratingsOf(pours: readonly TerrainPour[]): Map<string, number> {
  const rated = new Map<string, number>();
  for (const p of pours) if (!rated.has(p.drink.name)) rated.set(p.drink.name, p.rating.hedonic);
  return rated;
}

/** Whether a drink has a flavour they avoid. */
export const avoids = (d: Drink, a: Aversions) => (a.smoke && d.hasSmoke) || (a.bitter && d.isBitter) || (a.anise && d.hasAnise);

/**
 * Their menu: the drinks highest on their ground, highest first, leaving out
 * anything with a flavour they avoid and anything they last rated
 * `DISLIKED_AT` or lower — the rules the map's card applies to yours.
 */
export function menuOf(
  terrain: Terrain,
  aversions: Aversions,
  rated: ReadonlyMap<string, number>,
  count = 5,
  pool: readonly Drink[] = drinkDatabase
): Drink[] {
  return rankByTerrain(terrain, pool)
    .filter(({ drink }) => !avoids(drink, aversions) && (rated.get(drink.name) ?? Infinity) > DISLIKED_AT)
    .slice(0, count)
    .map((r) => r.drink);
}

/** Their ratings near a drink, the ones that put it where it stands (`evidenceAt`), not counting the drink itself. */
export function evidenceFor(terrain: Terrain, d: Drink): { name: string; hedonic: number }[] {
  return evidenceAt(terrain, d.x, d.y, kindOf(d))
    .filter((e) => e.drink.name !== d.name)
    .map((e) => ({ name: e.drink.name, hedonic: e.hedonic }));
}

/**
 * Where to measure a drink from: the nearest of their hilltops, since a
 * person with two liked parts of the map is in neither's middle. With no
 * hilltop (flat ground), `fallback` — their point.
 */
export function nearestHilltop(terrain: Terrain, d: { x: number; y: number }, fallback: { x: number; y: number }): { x: number; y: number } {
  let best: { x: number; y: number } | null = null;
  let bestD = Infinity;
  for (const p of peaks(terrain)) {
    const dist = Math.hypot(p.x - d.x, p.y - d.y);
    if (dist < bestD) {
      best = p;
      bestD = dist;
    }
  }
  return best ?? fallback;
}

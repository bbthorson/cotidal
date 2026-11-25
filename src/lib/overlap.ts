import { drinkDatabase, type Drink } from './data';
import { calculateDistance } from './scoring';
import { distanceBands } from './copy';
import { drinkHeight, type Terrain } from './terrain';

/**
 * Two coordinates side by side: how far apart they are, and three drinks that
 * say so. This compares maps; it never ranks the people on them
 * (docs/routes.md, "Compare maps, never rank palates") — there is no score
 * here that is better for being higher.
 *
 * The drinks lead with disagreement: what each would order that the other
 * would not, and then the one they would both order.
 */

export interface MapPoint {
  x: number;
  y: number;
  aversions: { smoke: boolean; bitter: boolean; anise: boolean };
}

/** The farthest two points on a 20 × 20 map can be. */
export const MAX_DISTANCE = Math.hypot(20, 20);

function allowed(drink: Drink, ...points: MapPoint[]): boolean {
  return points.every(
    ({ aversions }) =>
      !(aversions.smoke && drink.hasSmoke) &&
      !(aversions.bitter && drink.isBitter) &&
      !(aversions.anise && drink.hasAnise)
  );
}

function nearest(
  target: { x: number; y: number },
  candidates: Drink[],
  exclude: Set<string> = new Set()
): Drink | null {
  let best: Drink | null = null;
  let bestDistance = Infinity;
  for (const drink of candidates) {
    if (exclude.has(drink.name)) continue;
    const d = calculateDistance(target, drink);
    // Ties break by name so the page renders the same drink every time.
    if (d < bestDistance || (d === bestDistance && best && drink.name < best.name)) {
      best = drink;
      bestDistance = d;
    }
  }
  return best;
}

/** The plain-language reading of a distance, from `distanceBands` in copy.ts. */
export function describeDistance(distance: number): string {
  const band = distanceBands.find((b) => distance < b.under);
  return (band ?? distanceBands[distanceBands.length - 1]).text;
}

export interface Overlap {
  distance: number;
  description: string;
  /** Nearest to `subject` that `viewer` would not pick first. */
  theirs: Drink | null;
  /** Nearest to `viewer` that `subject` would not pick first. */
  yours: Drink | null;
  /** Nearest the midpoint, ordered by neither's aversions. */
  shared: Drink | null;
}

export function compareMaps(
  subject: MapPoint,
  viewer: MapPoint,
  drinks: Drink[] = drinkDatabase
): Overlap {
  const distance = calculateDistance(subject, viewer);
  const midpoint = { x: (subject.x + viewer.x) / 2, y: (subject.y + viewer.y) / 2 };

  const shared = nearest(
    midpoint,
    drinks.filter((d) => allowed(d, subject, viewer))
  );
  const taken = new Set(shared ? [shared.name] : []);

  // "Would not pick first" is literal: a drink is theirs only if it is nearer
  // to them than to you, so two people in the same spot get no false contrast.
  const theirs = nearest(
    subject,
    drinks.filter((d) => allowed(d, subject) && calculateDistance(d, subject) < calculateDistance(d, viewer)),
    taken
  );
  const yours = nearest(
    viewer,
    drinks.filter((d) => allowed(d, viewer) && calculateDistance(d, viewer) < calculateDistance(d, subject)),
    taken
  );

  return { distance, description: describeDistance(distance), theirs, yours, shared };
}

/** The drinks nearest one coordinate, for a map with nobody to compare against. */
export function nearestDrinks(point: MapPoint, count = 3, drinks: Drink[] = drinkDatabase): Drink[] {
  return drinks
    .filter((d) => allowed(d, point))
    .map((d) => ({ d, distance: calculateDistance(point, d) }))
    .sort((a, b) => a.distance - b.distance || a.d.name.localeCompare(b.d.name))
    .slice(0, count)
    .map(({ d }) => d);
}

/**
 * Two tastes side by side, as ground rather than points: what one would
 * reach for that the other would not, each way, and the one drink both would.
 * Like `compareMaps`, it compares maps and never ranks the people on them —
 * nothing here is better for being higher.
 *
 * A drink is someone's alone only where their ground stands at least
 * `CONTRAST_GAP` above the other's and high enough to be worth reaching for
 * (`REACH_FOR`), so two people who like the same things get no invented
 * contrast. How much the two agree is said in drinks, not a score: how many
 * of the first's top `TOP` are in the second's.
 */
export const CONTRAST_GAP = 1;
export const REACH_FOR = 6;
export const TOP = 10;

export interface TerrainSide {
  terrain: Terrain;
  aversions: { smoke: boolean; bitter: boolean; anise: boolean };
}

export interface TerrainOverlap {
  /** High on the first's ground and clearly lower on the second's. */
  firstOnly: Drink | null;
  /** High on the second's ground and clearly lower on the first's. */
  secondOnly: Drink | null;
  /** The drink standing highest on both at once. */
  shared: Drink | null;
  /** How many of the first's top `TOP` drinks are in the second's. */
  inCommon: number;
}

export function compareTerrains(first: TerrainSide, second: TerrainSide, drinks: readonly Drink[] = drinkDatabase): TerrainOverlap {
  const fine = (d: Drink, a: TerrainSide['aversions']) => !(a.smoke && d.hasSmoke) && !(a.bitter && d.isBitter) && !(a.anise && d.hasAnise);
  const rows = drinks.map((d) => ({
    d,
    a: drinkHeight(first.terrain, d).rating,
    b: drinkHeight(second.terrain, d).rating,
    okA: fine(d, first.aversions),
    okB: fine(d, second.aversions),
  }));
  // Ties by name, so a page draws the same drinks every time.
  const best = <T extends { d: Drink }>(list: T[], score: (r: T) => number) =>
    list.reduce<T | null>((top, r) => (!top || score(r) > score(top) || (score(r) === score(top) && r.d.name < top.d.name) ? r : top), null);

  const shared = best(
    rows.filter((r) => r.okA && r.okB),
    (r) => Math.min(r.a, r.b)
  );
  const taken = shared?.d.name;
  const firstOnly = best(
    rows.filter((r) => r.okA && r.d.name !== taken && r.a >= REACH_FOR && r.a - r.b >= CONTRAST_GAP),
    (r) => r.a - r.b
  );
  const secondOnly = best(
    rows.filter((r) => r.okB && r.d.name !== taken && r.b >= REACH_FOR && r.b - r.a >= CONTRAST_GAP),
    (r) => r.b - r.a
  );

  const top = (key: 'a' | 'b', ok: 'okA' | 'okB') =>
    new Set(
      rows
        .filter((r) => r[ok])
        .sort((x, y) => y[key] - x[key] || x.d.name.localeCompare(y.d.name))
        .slice(0, TOP)
        .map((r) => r.d.name)
    );
  const topA = top('a', 'okA');
  const topB = top('b', 'okB');

  return {
    firstOnly: firstOnly?.d ?? null,
    secondOnly: secondOnly?.d ?? null,
    shared: shared?.d ?? null,
    inCommon: [...topA].filter((n) => topB.has(n)).length,
  };
}

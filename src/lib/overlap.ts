import { drinkDatabase, type Drink } from './data';
import { calculateDistance } from './scoring';
import { distanceBands } from './copy';

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

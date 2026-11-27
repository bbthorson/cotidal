import { drinkDatabase, type Drink } from '../drinks/data';
import { drinkHeight, type Terrain } from './terrain';

/**
 * Two tastes side by side, and the shape a person's point and aversions take
 * where a page still reads one (`MapPoint`). This compares maps; it never
 * ranks the people on them (docs/routes.md, "Compare maps, never rank
 * palates") — there is no score here that is better for being higher.
 */

export interface MapPoint {
  x: number;
  y: number;
  aversions: { smoke: boolean; bitter: boolean; anise: boolean };
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
  /** The drink standing highest on both at once, if both would reach for it (`REACH_FOR`). */
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
    rows.filter((r) => r.okA && r.okB && Math.min(r.a, r.b) >= REACH_FOR),
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

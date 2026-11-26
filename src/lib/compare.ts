import { drinkDatabase, type Drink } from './data';
import { wayTo } from './drink-search';
import { compareTerrains, REACH_FOR, TOP, type TerrainOverlap } from './overlap';
import { avoids, evidenceFor, nearestHilltop, type Aversions } from './taste-reading';
import { drinkHeight, peaks, rankByTerrain, type Terrain } from './terrain';

/**
 * One comparison, whatever is compared with a taste: a drink is a point on
 * the map, a person is a set of points — their ground. Either way the same
 * three things are said (docs/map-first.md, Comparing):
 *
 * - **where it lies** from the nearest of the taste's hilltops (`wayTo`): for
 *   a drink, the drink; for a person, the highest of their hills;
 * - **whether it is reached for**: a drink standing at `REACH_FOR` or higher
 *   on the ground (and not a flavour the taste avoids), or, for a person, how
 *   many of their top `TOP` drinks are the taste's too;
 * - **what is behind that**: the taste's own ratings — near the drink, or of
 *   the person's top drinks.
 *
 * A person adds where the two part (`compareTerrains`). Never a predicted
 * score: a height decides "reached for", and is never shown.
 */

/** A taste to compare from: someone's ground, what they avoid, and their point (where the ground is flat). */
export interface Side {
  terrain: Terrain;
  aversions: Aversions;
  point: { x: number; y: number };
}

export type Target = { kind: 'drink'; drink: Drink } | { kind: 'person'; side: Side };

export interface Comparison {
  kind: Target['kind'];
  /** Where the target is measured: the drink, or the highest of their hills. */
  at: { x: number; y: number };
  /** The nearest of the taste's hilltops to it. */
  from: { x: number; y: number };
  distance: number;
  /** Which way, in the axes' words (`chart.wayOf`). */
  words: string;
  /** A drink: high enough on the ground to reach for. A person: any of their top drinks in common. */
  reach: boolean;
  /** A person: how many of their top `TOP` are the taste's top too. */
  inCommon?: number;
  /** The taste's own ratings behind it: near the drink, or of the person's top drinks, highest first. */
  behind: { name: string; hedonic: number }[];
  /** A drink: the taste's own latest rating of it, if any. */
  rated?: number;
  /** A person: where the two part, and one for both (`compareTerrains`). */
  overlap?: TerrainOverlap;
}

/** The latest rating of each drink on a ground. */
function latestRatings(t: Terrain): Map<string, number> {
  const latest = new Map<string, number>();
  for (const o of t.observations) latest.set(o.drink.name, o.hedonic);
  return latest;
}

/** The highest of someone's hills, or their point where the ground is flat. */
export function highestHill(side: Side): { x: number; y: number } {
  const [top] = [...peaks(side.terrain)].sort((a, b) => b.rating - a.rating);
  return top ? { x: top.x, y: top.y } : side.point;
}

export function compareWith(base: Side, target: Target, drinks: readonly Drink[] = drinkDatabase): Comparison {
  const at = target.kind === 'drink' ? { x: target.drink.x, y: target.drink.y } : highestHill(target.side);
  const from = nearestHilltop(base.terrain, at, base.point);
  const { distance, words } = wayTo(from, at);
  const ratings = latestRatings(base.terrain);

  if (target.kind === 'drink') {
    const d = target.drink;
    return {
      kind: 'drink',
      at,
      from,
      distance,
      words,
      reach: !avoids(d, base.aversions) && drinkHeight(base.terrain, d).rating >= REACH_FOR,
      behind: evidenceFor(base.terrain, d),
      rated: ratings.get(d.name),
    };
  }

  const overlap = compareTerrains(
    { terrain: base.terrain, aversions: base.aversions },
    { terrain: target.side.terrain, aversions: target.side.aversions },
    drinks
  );
  const theirTop = rankByTerrain(target.side.terrain, drinks.filter((d) => !avoids(d, target.side.aversions)))
    .slice(0, TOP)
    .map((r) => r.drink);
  const behind = theirTop
    .flatMap((d) => (ratings.has(d.name) ? [{ name: d.name, hedonic: ratings.get(d.name)! }] : []))
    .sort((a, b) => b.hedonic - a.hedonic || a.name.localeCompare(b.name))
    .slice(0, 3);
  return { kind: 'person', at, from, distance, words, reach: overlap.inCommon > 0, inCommon: overlap.inCommon, behind, overlap };
}

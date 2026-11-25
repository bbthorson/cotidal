import { describe, expect, test } from 'vitest';
import { drinkDatabase } from '@/lib/data';
import { quadrantIdFor } from '@/lib/quadrant';
import { createInitialPalateState, applyPour } from '@/lib/palate-state';
import {
  buildTerrain,
  evidenceAt,
  heightAt,
  hillWidth,
  peaks,
  rankByTerrain,
  SEA_LEVEL,
  SIGNAL_SD,
  type TerrainPour,
  type TerrainStart,
} from '@/lib/terrain';

/**
 * The terrain replaces a point with ground: these hold it to what a point
 * could not do (two liked parts of the map, a disliked drink, a quiz unsure
 * on one axis) and to what it must keep doing (with no pours, rank as the
 * distance from the quiz's point does).
 */

const pour = (name: string, hedonic: number): TerrainPour => ({ drink: { name }, rating: { hedonic } });
const drink = (name: string) => {
  const d = drinkDatabase.find((x) => x.name === name);
  if (!d) throw new Error(`No drink ${name}`);
  return d;
};
const rankOf = (ranked: ReturnType<typeof rankByTerrain>, name: string) => ranked.findIndex((r) => r.drink.name === name);

const middle: TerrainStart = { x: 1, y: 0, variance: { x: 4, y: 4 } };
const deep = ['Negroni', 'Old Fashioned', 'Manhattan', 'Boulevardier', 'Sazerac'];
const surf = ['Daiquiri (Classic)', 'Paloma', 'French 75', 'Aperol Spritz', 'Mojito'];
// Alternating, as they might be drunk.
const twoLoves = deep.flatMap((d, i) => [pour(d, 9), pour(surf[i], 9)]);

describe('with no pours, it is the quiz', () => {
  test('a round quiz ranks every drink by its distance from the quiz point', () => {
    const start: TerrainStart = { x: 3, y: -2, variance: { x: 3, y: 3 } };
    const ranked = rankByTerrain(buildTerrain(start, []));
    const byDistance = [...drinkDatabase].sort(
      (a, b) => Math.hypot(a.x - start.x, a.y - start.y) - Math.hypot(b.x - start.x, b.y - start.y)
    );
    for (let i = 1; i < ranked.length; i++) {
      const before = Math.hypot(ranked[i - 1].drink.x - start.x, ranked[i - 1].drink.y - start.y);
      const after = Math.hypot(ranked[i].drink.x - start.x, ranked[i].drink.y - start.y);
      expect(after).toBeGreaterThanOrEqual(before - 1e-9);
    }
    expect(ranked[0].drink.name).toBe(byDistance[0].name);
  });

  test('it is highest at the quiz point and returns to sea level far from it', () => {
    const t = buildTerrain(middle, []);
    const top = heightAt(t, middle.x, middle.y).rating;
    expect(top).toBeGreaterThan(SEA_LEVEL + 1);
    expect(heightAt(t, -10, -10).rating).toBeCloseTo(SEA_LEVEL, 0);
  });

  test('a quiz unsure of one axis lays a hill that is longer along it', () => {
    const start: TerrainStart = { x: 0, y: 0, variance: { x: 16, y: 1 } };
    const w = hillWidth(start);
    expect(w.x).toBeGreaterThan(w.y);
    const t = buildTerrain(start, []);
    // Three points along each axis: the ground holds up further along the unsure one.
    expect(heightAt(t, 3, 0).rating).toBeGreaterThan(heightAt(t, 0, 3).rating);
  });

  test('every height is the prior’s uncertainty', () => {
    const t = buildTerrain(middle, []);
    expect(heightAt(t, 4, 4).sd).toBeCloseTo(SIGNAL_SD, 6);
  });
});

describe('two liked parts of the map', () => {
  test('the point model settles between them and ranks them all far down', () => {
    // The failure the terrain exists for, measured on the point model itself.
    let s = createInitialPalateState({ x: middle.x, y: middle.y, variance: middle.variance });
    for (const p of twoLoves) s = applyPour(s, drink(p.drink.name), { hedonic: p.rating.hedonic });
    const at = { x: s.vector.crisp, y: s.vector.sweet };
    const nearest = Math.min(...twoLoves.map((p) => Math.hypot(drink(p.drink.name).x - at.x, drink(p.drink.name).y - at.y)));
    expect(nearest).toBeGreaterThan(7);
  });

  test('the terrain ranks every drink rated 9 above every drink nobody rated near the middle', () => {
    const ranked = rankByTerrain(buildTerrain(middle, twoLoves));
    const lowestLoved = Math.max(...twoLoves.map((p) => rankOf(ranked, p.drink.name)));
    for (const name of ['Hazy IPA', 'Hefeweizen', 'Naked & Famous', 'Division Bell']) {
      expect(rankOf(ranked, name)).toBeGreaterThan(lowestLoved);
    }
  });

  test('it has two hilltops, one in the Deep and one in the Surf', () => {
    const tops = peaks(buildTerrain(middle, twoLoves));
    const regions = new Set(tops.map((p) => quadrantIdFor(p.x, p.y)));
    expect(regions.has('deep')).toBe(true);
    expect(regions.has('surf')).toBe(true);
    // And the middle, where the point settled, is lower than either.
    const t = buildTerrain(middle, twoLoves);
    const mid = heightAt(t, 0, -1).rating;
    expect(heightAt(t, -6.5, -6.5).rating).toBeGreaterThan(mid);
    expect(heightAt(t, 7, 5.5).rating).toBeGreaterThan(mid);
  });

  test('the order of the pours does not matter', () => {
    const a = rankByTerrain(buildTerrain(middle, twoLoves));
    const b = rankByTerrain(buildTerrain(middle, [...twoLoves].reverse()));
    expect(b.map((r) => r.drink.name)).toEqual(a.map((r) => r.drink.name));
    for (let i = 0; i < a.length; i++) expect(b[i].rating).toBeCloseTo(a[i].rating, 9);
  });
});

describe('one pour', () => {
  test('a disliked drink sinks below its unrated neighbour', () => {
    const start: TerrainStart = { x: 7, y: 5, variance: { x: 2, y: 2 } };
    // The Daiquiri and the Southside share a coordinate; the Bee's Knees is a point away.
    const before = heightAt(buildTerrain(start, []), drink("Bee's Knees").x, drink("Bee's Knees").y).rating;
    const t = buildTerrain(start, [pour('Daiquiri (Classic)', 2)]);
    expect(heightAt(t, drink("Bee's Knees").x, drink("Bee's Knees").y).rating).toBeLessThan(before);
    const ranked = rankByTerrain(t);
    expect(rankOf(ranked, 'Daiquiri (Classic)')).toBeGreaterThan(rankOf(ranked, 'Mojito'));
  });

  test('the ground is surer where a drink was rated than far from it', () => {
    const t = buildTerrain(middle, [pour('Negroni', 8)]);
    const at = drink('Negroni');
    expect(heightAt(t, at.x, at.y).sd).toBeLessThan(heightAt(t, 8, 8).sd);
  });

  test('a pour of a drink not on the map shapes nothing', () => {
    const a = buildTerrain(middle, []);
    const b = buildTerrain(middle, [pour('House Punch Nobody Placed', 9)]);
    expect(b.observations).toHaveLength(0);
    expect(heightAt(b, 2, 2).rating).toBeCloseTo(heightAt(a, 2, 2).rating, 12);
  });

  test('a pour is found by its slug as a record stores it', () => {
    const t = buildTerrain(middle, [{ drink: { name: 'Some old name', slug: drink('Negroni').slug }, rating: { hedonic: 9 } }]);
    expect(t.observations.map((o) => o.drink.name)).toEqual(['Negroni']);
  });
});

describe('the evidence for a drink', () => {
  test('names the rated pours near it, the stronger pull first', () => {
    const t = buildTerrain(middle, [pour('Negroni', 9), pour('Manhattan', 6), pour('Daiquiri (Classic)', 9)]);
    const bijou = drink('Bijou');
    const ev = evidenceAt(t, bijou.x, bijou.y);
    expect(ev[0].drink.name).toBe('Negroni');
    expect(ev.map((e) => e.drink.name)).not.toContain('Daiquiri (Classic)');
  });

  test('is empty where only the questions speak', () => {
    const t = buildTerrain(middle, [pour('Negroni', 9)]);
    const far = drink("Moscato d'Asti");
    expect(evidenceAt(t, far.x, far.y)).toEqual([]);
  });

  test('takes a drink rated twice at its latest rating, once', () => {
    const t = buildTerrain(middle, [pour('Negroni', 3), pour('Negroni', 9)]);
    const at = drink('Negroni');
    expect(evidenceAt(t, at.x, at.y)).toEqual([{ drink: at, hedonic: 9, distance: 0 }]);
  });
});

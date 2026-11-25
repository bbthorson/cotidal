import { describe, expect, test } from 'vitest';
import { drinkDatabase } from '@/lib/data';
import { quadrantIdFor } from '@/lib/quadrant';
import { createInitialPalateState, applyPour } from '@/lib/palate-state';
import {
  buildTerrain,
  drinkHeight,
  evidenceAt,
  heightAt,
  hillWidth,
  kindOf,
  leanings,
  peaks,
  PEAK_MIN,
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

describe('a rating is partly about the drink itself', () => {
  // A Manhattan 9 and a Penicillin 8 make a hill in the Deep; then the Martinez, between them, is a 2.
  const loves = [pour('Manhattan', 9), pour('Penicillin', 8), pour('Daiquiri (Classic)', 8)];
  const withOne = [...loves, pour('Martinez', 2)];
  const withThree = [...withOne, pour('Bijou', 2), pour('Sazerac', 3)];
  const deepTop = (ps: TerrainPour[]) =>
    Math.max(...peaks(buildTerrain(middle, ps)).filter((p) => quadrantIdFor(p.x, p.y) === 'deep').map((p) => p.rating), 0);

  test('one dislike sinks that drink, not the hill around it', () => {
    const t = buildTerrain(middle, withOne);
    expect(drinkHeight(t, drink('Martinez')).rating).toBeLessThan(4);
    expect(drinkHeight(t, drink('Manhattan')).rating).toBeGreaterThan(8);
    expect(deepTop(withOne)).toBeGreaterThanOrEqual(PEAK_MIN);
  });

  test('dislikes that agree add up: the unrated drinks beside them sink further with each', () => {
    const at = (ps: TerrainPour[]) => drinkHeight(buildTerrain(middle, ps), drink('Old Fashioned')).rating;
    expect(at(withOne)).toBeLessThan(at(loves));
    expect(at(withThree)).toBeLessThan(at(withOne));
    expect(at(withThree)).toBeLessThan(at(loves) - 1);
  });

  test('a drink rated keeps close to its own rating', () => {
    const t = buildTerrain(middle, [pour('Negroni', 9)]);
    expect(drinkHeight(t, drink('Negroni')).rating).toBeGreaterThan(8);
    // Its neighbour, unrated, is raised less than it.
    expect(heightAt(t, drink('Bijou').x, drink('Bijou').y, 'spirits').rating).toBeLessThan(drinkHeight(t, drink('Negroni')).rating);
  });
});

describe('a rating carries less to another kind of drink', () => {
  test('after cocktails in the Deep, the cocktails beside them come before the wines beside them', () => {
    const t = buildTerrain(middle, [pour('Manhattan', 9), pour('Penicillin', 8)]);
    const ranked = rankByTerrain(t);
    // Rioja and Malbec sit a point from the Manhattan, as close as the cocktails do.
    for (const wine of ['Rioja (Tempranillo)', 'Malbec (Mendoza)']) {
      for (const cocktail of ['Martinez', 'Oaxaca Old Fashioned', 'Old Fashioned']) {
        expect(rankOf(ranked, cocktail), `${cocktail} before ${wine}`).toBeLessThan(rankOf(ranked, wine));
      }
    }
  });

  test('and the other way: after a Barolo, the wines beside it come before the cocktails', () => {
    const ranked = rankByTerrain(buildTerrain(middle, [pour('Barolo (Nebbiolo)', 9)]));
    expect(rankOf(ranked, 'Syrah (Northern Rhône)')).toBeLessThan(rankOf(ranked, 'Negroni'));
    expect(rankOf(ranked, 'Syrah (Northern Rhône)')).toBeLessThan(rankOf(ranked, 'Bijou'));
  });

  test('cocktails and spirits are one kind', () => {
    expect(kindOf(drink('Islay Scotch (Neat)'))).toBe(kindOf(drink('Penicillin')));
    expect(kindOf(drink('Guinness'))).not.toBe(kindOf(drink('Penicillin')));
  });
});

describe('your taste in words', () => {
  test('two hills are two leanings, highest first, in the axes’ words', () => {
    const lean = leanings(buildTerrain(middle, twoLoves));
    const words = lean.map((l) => `${l.x} ${l.y}`);
    expect(words).toContain('rich savory');
    expect(words).toContain('crisp sweet');
    for (let i = 1; i < lean.length; i++) expect(lean[i].rating).toBeLessThanOrEqual(lean[i - 1].rating);
  });

  test('a hill in the middle of an axis does not lean on it', () => {
    const lean = leanings(buildTerrain({ x: 0, y: 6, variance: { x: 2, y: 2 } }, []));
    expect(lean).toEqual([expect.objectContaining({ x: null, y: 'sweet' })]);
  });

  test('two hilltops leaning the same way are said once', () => {
    const lean = leanings(buildTerrain(middle, [pour('Daiquiri (Classic)', 9), pour('Hugo Spritz', 9), pour('Tequila Sunrise', 9)]));
    const keys = lean.map((l) => `${l.x}/${l.y}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

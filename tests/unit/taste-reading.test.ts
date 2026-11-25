import { describe, expect, test } from 'vitest';
import { drinkDatabase } from '@/lib/data';
import { evidenceFor, menuOf, nearestHilltop, ratingsOf, terrainOf } from '@/lib/taste-reading';

/**
 * Reading someone's taste (`taste-reading.ts`): the rules their map and the
 * chat tools share, so both give the same answer.
 */
const none = { smoke: false, bitter: false, anise: false };
const pours = (list: [string, number][]) => list.map(([name, hedonic]) => ({ drink: { name }, rating: { hedonic } }));
const byName = (n: string) => drinkDatabase.find((d) => d.name === n)!;

describe('their menu', () => {
  const t = terrainOf({ x: -6, y: -6, variance: { x: 2, y: 2 } }, { x: 0, y: 0 }, pours([['Manhattan', 9], ['Negroni', 2]]));
  const rated = ratingsOf(pours([['Manhattan', 9], ['Negroni', 2]]));

  test('leaves out what they rated low and what they avoid', () => {
    const menu = menuOf(t, none, rated, 20).map((d) => d.name);
    expect(menu).not.toContain('Negroni');
    expect(menu).toContain('Manhattan');
    expect(menuOf(t, { ...none, bitter: true }, rated, 20).every((d) => !d.isBitter)).toBe(true);
  });

  test('says what put a drink there: their ratings near it, not the drink itself', () => {
    const near = evidenceFor(t, byName('Old Fashioned')).map((e) => e.name);
    expect(near).toContain('Manhattan');
    expect(evidenceFor(t, byName('Manhattan')).map((e) => e.name)).not.toContain('Manhattan');
  });
});

describe('where a drink is measured from', () => {
  test('the nearest of two hilltops, not a point between them', () => {
    const t = terrainOf({ x: 0, y: 0, variance: { x: 25, y: 25 } }, { x: 0, y: 0 }, pours([['Manhattan', 9], ['Old Fashioned', 9], ['Daiquiri (Classic)', 9], ['Mojito', 9]]));
    const deep = nearestHilltop(t, byName('Sazerac'), { x: 0, y: 0 });
    const surf = nearestHilltop(t, byName('Mojito'), { x: 0, y: 0 });
    expect(deep.x).toBeLessThan(0);
    expect(surf.x).toBeGreaterThan(0);
  });

  test('their latest rating of a drink is the one that counts (pours newest first)', () => {
    expect(ratingsOf(pours([['Negroni', 3], ['Negroni', 9]])).get('Negroni')).toBe(3);
  });
});

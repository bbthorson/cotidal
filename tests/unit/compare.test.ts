import { describe, expect, test } from 'vitest';
import { compareWith, highestHill, type Side } from '@/lib/palate/compare';
import { drinkDatabase } from '@/lib/drinks/data';
import { TOP } from '@/lib/palate/overlap';
import { buildTerrain } from '@/lib/palate/terrain';

const none = { smoke: false, bitter: false, anise: false };
const pours = (list: [string, number][]) => list.map(([name, hedonic]) => ({ drink: { name }, rating: { hedonic } }));
const side = (x: number, y: number, rated: [string, number][]): Side => ({
  terrain: buildTerrain({ x, y, variance: { x: 2, y: 2 } }, pours(rated)),
  aversions: none,
  point: { x, y },
});
const drink = (name: string) => drinkDatabase.find((d) => d.name === name)!;

const deep = side(-6, -6, [['Manhattan', 9], ['Old Fashioned', 9], ['Daiquiri (Classic)', 2]]);
const surf = side(6, 5, [['Daiquiri (Classic)', 9], ['Mojito', 9]]);

describe('Comparing a taste with a drink or a person: one comparison, a point or a set of points', () => {
  test('a drink: where it lies from the nearest hill, whether it is reached for, and the ratings behind it', () => {
    const near = compareWith(deep, { kind: 'drink', drink: drink('Martinez') });
    expect(near.reach).toBe(true);
    expect(near.behind.map((b) => b.name)).toContain('Manhattan');
    const far = compareWith(deep, { kind: 'drink', drink: drink('Mojito') });
    expect(far.reach).toBe(false);
    expect(far.distance).toBeGreaterThan(near.distance);
    // Its own rating is said, not counted among what is near it.
    const rated = compareWith(deep, { kind: 'drink', drink: drink('Manhattan') });
    expect(rated.rated).toBe(9);
    expect(rated.behind.map((b) => b.name)).not.toContain('Manhattan');
  });

  test('a person is measured the same way, from the same hill, to the highest of theirs', () => {
    const c = compareWith(deep, { kind: 'person', side: surf });
    expect(c.at).toEqual(highestHill(surf));
    expect(c.at.x).toBeGreaterThan(0);
    expect(c.from.x).toBeLessThan(0);
    expect(c.reach).toBe(false);
    expect(c.inCommon).toBeLessThan(TOP);
    expect(c.overlap?.firstOnly).not.toBeNull();
    // What is behind it is the taste's own ratings of the person's top drinks.
    expect(c.behind.map((b) => b.name)).toEqual(['Daiquiri (Classic)']);
  });

  test('the same taste compared with itself: no distance, everything in common', () => {
    const c = compareWith(deep, { kind: 'person', side: deep });
    expect(c.distance).toBe(0);
    expect(c.inCommon).toBe(TOP);
    expect(c.reach).toBe(true);
  });
});

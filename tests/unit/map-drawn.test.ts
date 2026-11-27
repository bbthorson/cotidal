import { describe, expect, test } from 'vitest';
import { drinkDatabase } from '../../src/lib/drinks/data';
import { quadrantIdFor } from '../../src/lib/map/coordinates';
import { capMarks, drawnDrinks, isStaple, MAX_MARKS, STAPLE_SLUGS, staples } from '../../src/lib/map/drawn';

describe('What the map draws', () => {
  test('the library holds more drinks than any one view draws', () => {
    expect(drinkDatabase.length).toBeGreaterThan(MAX_MARKS);
    expect(staples.length).toBeLessThanOrEqual(MAX_MARKS);
  });

  test('the staples are drinks on the map, each once', () => {
    expect(new Set(STAPLE_SLUGS).size).toBe(STAPLE_SLUGS.length);
    expect(staples.map((d) => d.slug)).toEqual([...STAPLE_SLUGS]);
  });

  test('the staples cover every region and every kind of drink, no two at one point', () => {
    const perRegion = new Map<string, number>();
    for (const d of staples) perRegion.set(quadrantIdFor(d.x, d.y), (perRegion.get(quadrantIdFor(d.x, d.y)) ?? 0) + 1);
    for (const region of ['surf', 'eddy', 'salt-line', 'deep']) expect(perRegion.get(region) ?? 0).toBeGreaterThanOrEqual(8);
    expect(new Set(staples.map((d) => d.type))).toEqual(new Set(['Cocktail', 'Wine', 'Beer', 'Spirit']));
    const points = staples.map((d) => `${d.x},${d.y}`);
    expect(new Set(points).size).toBe(points.length);
  });

  test('with nothing to filter by, the staples; with a filter, its drinks instead', () => {
    expect(drawnDrinks({})).toEqual(new Set(staples.map((d) => d.name)));
    const focus = new Set(['Gose', 'Witbier']);
    expect(drawnDrinks({ focus })).toEqual(focus);
  });

  test('what a view is about is drawn whatever the filter', () => {
    // A pour of a drink that is no staple, and the open drink.
    const drawn = drawnDrinks({ focus: new Set(['Gose']), also: ['Vesper', 'Bamboo', null, undefined] });
    expect([...drawn].sort()).toEqual(['Bamboo', 'Gose', 'Vesper']);
    expect(drawnDrinks({ also: ['Vesper'] }).has('Vesper')).toBe(true);
    expect(isStaple({ name: 'Vesper' })).toBe(false);
  });

  test('a bar’s menu draws its pins and nothing else', () => {
    const drawn = drawnDrinks({ pins: ['Negroni', 'Daiquiri (Classic)'], focus: new Set(['Gose']), also: ['Vesper'] });
    expect([...drawn].sort()).toEqual(['Daiquiri (Classic)', 'Negroni', 'Vesper']);
  });

  test('a filter larger than the map keeps its staples, then its order', () => {
    const cocktails = drinkDatabase.filter((d) => d.type === 'Cocktail');
    expect(cocktails.length).toBeGreaterThan(MAX_MARKS);
    const kept = capMarks(cocktails);
    expect(kept).toHaveLength(MAX_MARKS);
    const stapleCocktails = cocktails.filter(isStaple);
    expect(kept.slice(0, stapleCocktails.length)).toEqual(stapleCocktails);
    // A ranked filter keeps its highest.
    const ranked = [...cocktails].reverse();
    expect(capMarks(ranked).slice(stapleCocktails.length)[0]).toBe(ranked.find((d) => !isStaple(d)));
    // One that fits is drawn whole, in its order.
    const wines = drinkDatabase.filter((d) => d.type === 'Wine');
    expect(capMarks(wines)).toEqual(wines);
  });
});

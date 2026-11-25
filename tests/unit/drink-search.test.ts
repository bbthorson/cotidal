import { expect, test } from 'vitest';
import { drinkDatabase } from '@/lib/data';
import { calculateDistance } from '@/lib/scoring';
import { closestDrinks, drinksAtSameSpot, namesMatching, searchDrinks, unlistedBar, wayTo } from '@/lib/drink-search';
import type { Register } from '@/lib/register';

/** Compass's search and the rating sheet's quick picks: what was typed in, what is found. */

const register: Register = {
  'Daiquiri (Classic)': { slug: 'daiquiri', title: 'Daiquiri', build: 'White rum · Lime · Sugar' },
  Negroni: { slug: 'negroni', title: 'Negroni', build: 'Gin · Campari · Sweet vermouth' },
};

test('Search: nothing typed finds nothing', () => {
  expect(searchDrinks('  ', drinkDatabase, register)).toEqual([]);
});

test('Search: by name, by title, and by what is in it', () => {
  const names = (q: string) => searchDrinks(q, drinkDatabase, register).map((d) => d.name);
  expect(names('negroni')).toContain('Negroni');
  // The register's title, without the parenthetical.
  expect(names('DAIQUIRI')).toContain('Daiquiri (Classic)');
  // What is in it, accents and case aside.
  expect(names('campári')).toContain('Negroni');
  expect(names('campari')).not.toContain('Daiquiri (Classic)');
});

test('Search: keeps the order it was given', () => {
  const reversed = [...drinkDatabase].reverse();
  const hits = searchDrinks('gin', reversed, register);
  expect(hits).toEqual(reversed.filter((d) => hits.includes(d)));
});

test('Bars: by name, case and accents aside; an unlisted name is offered', () => {
  const bars = [{ name: 'Attaboy' }, { name: 'Café Dante' }];
  expect(namesMatching('dante', bars)).toEqual([{ name: 'Café Dante' }]);
  expect(unlistedBar('cafe dante', false, bars)).toBeNull();
  expect(unlistedBar(' Dante ', false, bars)).toBe('Dante');
  expect(unlistedBar('', false, bars)).toBeNull();
  expect(unlistedBar('Attaboy', false, [], bars)).toBeNull();
});

test('Bars: words that found drinks are not offered as a bar', () => {
  const found = searchDrinks('mezcal', drinkDatabase, {}).length > 0;
  expect(found).toBe(true);
  expect(unlistedBar('mezcal', found, [])).toBeNull();
});

test('Closest drinks: nearest first, ties in the map’s order', () => {
  const point = { x: -4.2, y: -3.1 };
  const near = closestDrinks(point, 4);
  expect(near).toHaveLength(4);
  const d = near.map((x) => calculateDistance(point, x));
  expect(d).toEqual([...d].sort((a, b) => a - b));
  const nothingCloser = drinkDatabase.filter((x) => calculateDistance(point, x) < d[0]);
  expect(nothingCloser).toEqual([]);
});

test('Same spot: the other drinks at exactly that point', () => {
  for (const drink of drinkDatabase) {
    const same = drinksAtSameSpot(drink);
    expect(same).not.toContain(drink);
    for (const s of same) expect([s.x, s.y]).toEqual([drink.x, drink.y]);
  }
});

test('Which way: the axes’ own words, and how far to a tenth', () => {
  expect(wayTo({ x: -3.45, y: -2.85 }, { x: -5, y: -4 })).toEqual({ words: 'richer, more savory', distance: 1.9 });
  expect(wayTo({ x: 0, y: 0 }, { x: 3, y: 0.2 })).toEqual({ words: 'crisper', distance: 3 });
  expect(wayTo({ x: 0, y: 0 }, { x: 0.3, y: 2 }).words).toBe('sweeter');
  expect(wayTo({ x: 1, y: 1 }, { x: 1.2, y: 0.9 }).words).toBe('right here');
});

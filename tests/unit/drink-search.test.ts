import { expect, test } from 'vitest';
import { drinkDatabase } from '@/lib/data';
import { calculateDistance } from '@/lib/scoring';
import { closestDrinks, drinksAtSameSpot, namesMatching, searchDrinks, unlistedBar } from '@/lib/drink-search';
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
  expect(unlistedBar('cafe dante', bars)).toBeNull();
  expect(unlistedBar(' Dante ', bars)).toBe('Dante');
  expect(unlistedBar('', bars)).toBeNull();
  expect(unlistedBar('Attaboy', [], bars)).toBeNull();
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

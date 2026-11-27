import { test, expect } from 'vitest';
import { drinkDatabase } from '../../src/lib/drinks/data';
import { baseName, drinkOf, matchDrink, normalizeName } from '../../src/lib/drinks/search';

test('Drink match: a name finds its drink without the parenthetical, its case or its accents', () => {
  expect(matchDrink('margarita')?.name).toBe('Margarita');
  expect(matchDrink("Tommy's Margarita")?.slug).toBe('tommys-margarita');
  expect(matchDrink('rum & coke')?.name).toBe('Cuba Libre');
  // How menus and the IBA spell drinks the map has.
  expect(matchDrink('Martini')?.name).toBe('Dry Martini');
  expect(matchDrink('Espresso Martini')?.name).toBe('Espresso Martini');
  expect(matchDrink('South Side')?.name).toBe('Southside');
  expect(matchDrink('Corpse Reviver #2')?.name).toBe('Corpse Reviver No. 2');
  expect(matchDrink('Hugo')?.name).toBe('Hugo Spritz');
  expect(matchDrink('Pina Colada')?.name).toBe('Piña Colada');
  expect(matchDrink('Dark and Stormy')?.name).toBe("Dark 'n' Stormy");
  expect(matchDrink("Dark n' Stormy")?.name).toBe("Dark 'n' Stormy");
  expect(matchDrink('Pornstar Martini')?.name).toBe('Porn Star Martini');
  expect(matchDrink('Kir Royale')?.name).toBe('Kir Royal');
  expect(matchDrink('Tequila Tonic')?.name).toBe('Tequila & Tonic');
  expect(matchDrink('  DAIQUIRI (classic) ')?.name).toBe('Daiquiri (Classic)');
  expect(matchDrink('Syrah')?.name).toBe('Syrah (Northern Rhône)');
  expect(matchDrink('Naked and Famous')?.name).toBe('Naked & Famous');
  expect(matchDrink('lambrusco')?.name).toBe('Lambrusco');
  expect(matchDrink('Lambrusco di Sorbara')?.name).toBe('Lambrusco');
  expect(matchDrink('Prosecco DOC')?.name).toBe('Prosecco');
  expect(matchDrink('ipa')?.name).toBe('IPA (West Coast)');
  expect(matchDrink('House daiquiri with mezcal')).toBeNull();
  expect(matchDrink('')).toBeNull();
});

test('Drink match: every alias finds its own drink', () => {
  for (const d of drinkDatabase) for (const a of d.aliases ?? []) expect(matchDrink(a)?.name, a).toBe(d.name);
});

test('Drink match: no name, bare name or alias means two drinks', () => {
  // A collision would silently send one drink's pours to the other.
  const owner = new Map<string, string>();
  for (const d of drinkDatabase) {
    const keys = new Set([normalizeName(d.name), baseName(d.name), ...(d.aliases ?? []).map(normalizeName)]);
    for (const k of keys) {
      expect(owner.get(k) ?? d.name, `"${k}" names both ${owner.get(k)} and ${d.name}`).toBe(d.name);
      owner.set(k, d.name);
    }
  }
});

test('drinkOf: a stored reference finds its drink by slug first, then by name', () => {
  // The slug wins: a drink renamed since the pour was written is still found.
  expect(drinkOf({ name: 'A name the map no longer uses', slug: 'negroni' })?.name).toBe('Negroni');
  // So does a house name: what the pour was called, and which drink it was, are separate.
  expect(drinkOf({ name: 'House Negroni', slug: 'negroni' })?.name).toBe('Negroni');
  // No slug, or one the catalog no longer has: by name, as matchDrink reads it.
  expect(drinkOf({ name: 'margarita' })?.name).toBe('Margarita');
  expect(drinkOf({ name: 'margarita', slug: 'retired-drink' })?.name).toBe('Margarita');
  expect(drinkOf({ name: 'House Sour' })).toBeNull();
});

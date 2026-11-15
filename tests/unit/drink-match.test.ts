import { test, expect } from 'vitest';
import { drinkDatabase } from '../../src/lib/data';
import { baseName, matchDrink, normalizeName } from '../../src/lib/drink-match';

test('Drink match: a name finds its drink without the parenthetical, its case or its accents', () => {
  expect(matchDrink('margarita')?.name).toBe("Margarita (Tommy's Style)");
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

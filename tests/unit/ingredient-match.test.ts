import { describe, expect, it } from 'vitest';
import { clashingAversions, detectAversions, splitMenuLine, suggestClosestDrink } from '@/lib/ingredient-match';

describe('ingredient-match', () => {
  it('detects smoke, bitterness, and anise signals from descriptions', () => {
    expect(detectAversions('mezcal, lime, chile')).toEqual({ smoke: true, bitter: false, anise: false });
    expect(detectAversions('gin, Campari, sweet vermouth')).toEqual({ smoke: false, bitter: true, anise: false });
    expect(detectAversions('rye, absinthe rinse, Peychaud bitters')).toEqual({ smoke: false, bitter: true, anise: true });
    expect(detectAversions('vodka, lime, ginger beer')).toEqual({ smoke: false, bitter: false, anise: false });
  });

  it('returns only the aversions that clash with the user’s flags', () => {
    const clashes = clashingAversions('mezcal, Campari, lime', { smoke: true, bitter: false, anise: true });
    expect(clashes).toEqual(['smoke']);
  });

  it('splits pasted menu lines into name and description and strips prices', () => {
    expect(splitMenuLine('• Paper Tiger — mezcal, lime, agave · $18')).toEqual({
      name: 'Paper Tiger',
      description: 'mezcal, lime, agave',
    });
    expect(splitMenuLine('House Spritz: aperol, prosecco, soda $15')).toEqual({
      name: 'House Spritz',
      description: 'aperol, prosecco, soda',
    });
    expect(splitMenuLine('Velvet Smoke (mezcal, grapefruit, salt)')).toEqual({
      name: 'Velvet Smoke',
      description: 'mezcal, grapefruit, salt',
    });
    // Preserves known parenthetical names on the map.
    expect(splitMenuLine('Daiquiri (Classic) $16')).toEqual({ name: 'Daiquiri (Classic)' });
  });

  it('suggests a structural classic when defining ingredients are present, and null otherwise', () => {
    expect(suggestClosestDrink('mezcal, Aperol, lime, yellow chartreuse')?.name).toBe('Naked & Famous');
    expect(suggestClosestDrink('bourbon, amaro nonino, lemon')?.name).toBe('Paper Plane');
    expect(suggestClosestDrink('vodka, espresso, vanilla liqueur')?.name).toBe('Espresso Martini');
    expect(suggestClosestDrink('house special with seasonal fruit')).toBeNull();
  });
});

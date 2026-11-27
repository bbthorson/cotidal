import { describe, expect, it } from 'vitest';
import {
  clashingAversions,
  detectAversions,
  extractMenuPrice,
  extractPrimitives,
  isNonAlcoholic,
  parseSectionHeader,
  placeDirectional,
  splitMenuLine,
  suggestClosestDrink,
} from '@/lib/drinks/ingredient-match';

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

  it('extracts trailing prices and parses section headers cleanly', () => {
    expect(extractMenuPrice('Chaplin — bourbon, sherry, Ramazotti · $17')).toBe('$17');
    expect(extractMenuPrice('Daiquiri (Classic) $16.50')).toBe('$16.50');
    expect(extractMenuPrice('Negroni')).toBeUndefined();

    expect(parseSectionHeader('## Non-Alcoholic')).toBe('Non-Alcoholic');
    expect(parseSectionHeader('[Les Martinis]')).toBe('Les Martinis');
    expect(parseSectionHeader('Zero-Proof:')).toBe('Zero-Proof');
    expect(parseSectionHeader('Paper Tiger — mezcal, lime, agave')).toBeNull();
    expect(parseSectionHeader('Mystery Special')).toBeNull();
  });

  it('suggests a structural classic when defining ingredients are present, and null otherwise', () => {
    expect(suggestClosestDrink('mezcal, Aperol, lime, yellow chartreuse')?.name).toBe('Naked & Famous');
    expect(suggestClosestDrink('bourbon, amaro nonino, lemon')?.name).toBe('Paper Plane');
    expect(suggestClosestDrink('vodka, espresso, vanilla liqueur')?.name).toBe('Espresso Martini');
    expect(suggestClosestDrink('house special with seasonal fruit')).toBeNull();
  });

  it('handles Ramazotti, Centerbe, Hoja Santa, generic whiskey/vermouth, and sugar snap pea', () => {
    const chaplin = placeDirectional('Chaplin — bourbon, sherry, Ramazotti, Cointreau');
    expect(chaplin).not.toBeNull();
    expect(chaplin!.quadrant).toBe('deep');
    expect(chaplin!.aversions.bitter).toBe(true);
    expect(chaplin!.primitives.map((p) => p.id)).toContain('amaro');

    const centerbeIds = extractPrimitives('gin, Faccia Bruto Centerbe, lime').map((p) => p.id);
    expect(centerbeIds).toContain('herbal-liqueur');

    const hojaIds = extractPrimitives('mezcal, Hoja Santa, lime').map((p) => p.id);
    expect(hojaIds).toContain('anise-herb');
    expect(detectAversions('mezcal, Hoja Santa, lime').anise).toBe(true);

    const genericIds = extractPrimitives('whiskey, vermouth, orange bitters').map((p) => p.id);
    expect(genericIds).toContain('whiskey');
    expect(genericIds).toContain('vermouth');

    // Specific whiskey/vermouth should not double-count generic primitives.
    const specificIds = extractPrimitives('rye whiskey, sweet vermouth, angostura').map((p) => p.id);
    expect(specificIds).toContain('rye');
    expect(specificIds).not.toContain('whiskey');
    expect(specificIds).toContain('sweet-vermouth');
    expect(specificIds).not.toContain('vermouth');

    // "sugar snap pea" must not false-match sugar-syrup.
    const peaIds = extractPrimitives('gin, sugar snap pea, lime').map((p) => p.id);
    expect(peaIds).not.toContain('sugar-syrup');
  });

  it('detects non-alcoholic drinks and suppresses alcoholic closestClassic suggestions', () => {
    expect(isNonAlcoholic('My Fair Lady — Everleaf, grapefruit, soda')).toBe(true);
    expect(isNonAlcoholic('January Spritz — Roots Divino, grapefruit, soda')).toBe(true);
    expect(isNonAlcoholic('Early Check In — Pentire, lime, jalapeño')).toBe(true);
    expect(isNonAlcoholic('Aplos Cooler — Aplos, cucumber, tonic')).toBe(true);
    expect(isNonAlcoholic('Zero-Proof Spritz — grapefruit, soda')).toBe(true);
    expect(isNonAlcoholic('Citrus Fizz — grapefruit, lime, soda', 'Non-Alcoholic')).toBe(true);
    expect(isNonAlcoholic('Chaplin — bourbon, sherry, Ramazotti')).toBe(false);

    const fairLady = placeDirectional('My Fair Lady — Everleaf, grapefruit, lime, soda');
    expect(fairLady).not.toBeNull();
    expect(fairLady!.nonAlcoholic).toBe(true);
    expect(fairLady!.closestClassic).toBeNull();

    const earlyCheckIn = placeDirectional('Early Check In — Pentire, lime, jalapeño, agave');
    expect(earlyCheckIn).not.toBeNull();
    expect(earlyCheckIn!.nonAlcoholic).toBe(true);
    expect(earlyCheckIn!.closestClassic).toBeNull();

    const bySection = placeDirectional('Citrus Spritz — grapefruit, lime, soda', undefined, {
      section: 'Non-Alcoholic',
    });
    expect(bySection).not.toBeNull();
    expect(bySection!.nonAlcoholic).toBe(true);
    expect(bySection!.closestClassic).toBeNull();
  });
});

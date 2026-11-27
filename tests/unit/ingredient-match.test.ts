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
  classicInName,
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

  it('reads a house drink’s name for the classic it builds on', () => {
    expect(classicInName('Adventure Negroni')?.name).toBe('Negroni');
    expect(classicInName('Epazote Mojito')?.name).toBe('Mojito');
    expect(classicInName('Margarita Tomás')?.name).toBe("Margarita (Tommy's Style)");
    // The longest classic named wins.
    expect(classicInName('Smoky Mezcal Negroni')?.name).toBe('Mezcal Negroni');
    // Whole words only, and never a wine or beer named as an ingredient.
    expect(classicInName('Negronish')).toBeNull();
    expect(classicInName('Prosecco Punch')).toBeNull();
    // A name with no classic in it says nothing.
    expect(classicInName('Carajo')).toBeNull();
  });

  it('does not believe a name its ingredients contradict', () => {
    // A Negroni by name, but crisp and sweet by everything in it.
    expect(
      suggestClosestDrink('Beach Negroni rum, pineapple, passion fruit, mint, soda', undefined, { name: 'Beach Negroni' })?.name
    ).not.toBe('Negroni');
  });

  // A real menu (Soccería, November 2026) that rank_menu read badly.
  describe('an agave bar’s menu', () => {
    const place = (name: string, description: string) =>
      placeDirectional(`${name} ${description}`, undefined, { name });
    const relative = (name: string, description: string) =>
      place(name, description)?.closestClassic ?? suggestClosestDrink(`${name} ${description}`, undefined, { name });
    const names = (name: string, description: string) =>
      extractPrimitives(`${name} ${description}`).map((p) => p.id);

    it('reads a blanco vermouth as vermouth, not tequila', () => {
      const ids = names('Roma with a View', 'aperitivo, Lustau Blanco Vermouth, lime, soda');
      expect(ids).not.toContain('tequila');
      expect(ids).toEqual(expect.arrayContaining(['aperitivo', 'lillet-cocchi', 'lime', 'soda']));
      expect(names('Soccerita', 'Volcán de Mi Tierra Blanco tequila, passionfruit, lime')).toContain('tequila');
      expect(names('Blanco Sour', 'blanco, lime, agave')).toContain('tequila');
    });

    it('reads beer, tomato and chamoy, and not ginger beer as beer', () => {
      expect(names('Michelada', 'tomato, spices, chamoy, fresh lime, chile-lime salt, Tecate')).toEqual(
        expect.arrayContaining(['beer', 'tomato', 'chamoy', 'lime'])
      );
      expect(names('Chelada', 'fresh lime, chile-lime salt, Tecate or Electrolime N/A')).toContain('beer');
      expect(names('El Diablo', 'reposado tequila, cassis, lime, spicy ginger beer')).not.toContain('beer');
      // Built on beer, so never likened to a cocktail.
      for (const [name, description] of [
        ['Michelada', 'tomato, spices, chamoy, fresh lime, chile-lime salt, Tecate'],
        ['Chelada', 'fresh lime, chile-lime salt, Tecate'],
      ]) {
        const like = relative(name, description);
        if (like) expect(like.type).toBe('Beer');
      }
    });

    it('points house drinks at the classic they build on', () => {
      expect(relative('Adventure Negroni', 'spirit of choice (red or white), Vermouth, citrus')?.name).toBe('Negroni');
      expect(relative('Epazote Mojito', 'cucumber vodka, epazote, lime, mint, soda')?.name).toBe('Mojito');
      expect(relative('Margarita Tomás', 'choice of tequila or mezcal, fresh lime, agave, chile-lime salt')?.name).toBe(
        "Margarita (Tommy's Style)"
      );
      expect(relative('Spritz de la Casa', 'Primo Mexican Aperitivo, lemon, sparkling wine, soda')?.name).toBe(
        'Aperol Spritz'
      );
      expect(relative('Roma with a View', 'aperitivo, Lustau Blanco Vermouth, lime, soda')?.name).toBe(
        'Americano (Cocktail)'
      );
      expect(relative('Palomazo', 'choice of tequila or mezcal, grapefruit cordial, fresh lime, soda')?.name).toBe(
        'Mezcal Paloma'
      );
    });
  });
});

import { describe, expect, it } from 'vitest';
import { addMenuLine, addMenuLines, rankMenu, scoreDrinks, type MenuItem } from '@/lib/menu-rank';
import { calculateDistance, RELEVANCE_BAND } from '@/lib/scoring';

const you = { x: 4, y: -2, vibeTags: {} };

describe('menu lines', () => {
  it('place a name or alias on the map, and keep what the map does not know', () => {
    let items: MenuItem[] = [];
    for (const line of ['negroni', 'Last Word', 'House Special']) items = addMenuLine(items, line, {});
    expect(items.map((i) => !!i.drink)).toEqual([true, true, false]);
    expect(items[2].label).toBe('House Special');
  });

  it('ignore a blank line and a repeat', () => {
    let items = addMenuLine([], 'negroni', {});
    expect(addMenuLine(items, '  ', {})).toBe(items);
    items = addMenuLine(items, 'NEGRONI', {});
    expect(items).toHaveLength(1);
  });

  it('parses a multi-line pasted menu and attaches descriptions and close classics', () => {
    const items = addMenuLines(
      [],
      '• Negroni $16\nPaper Tiger — mezcal, Aperol, lime · $18\n\nLast Word',
      {}
    );
    expect(items).toHaveLength(3);
    expect(items[0].drink?.name).toBe('Negroni');
    expect(items[1].drink).toBeNull();
    expect(items[1].label).toBe('Paper Tiger');
    expect(items[1].description).toBe('mezcal, Aperol, lime');
    expect(items[1].relative?.name).toBe('Naked & Famous');
    expect(items[2].drink?.name).toBe('Last Word');
  });
});

describe('rankMenu', () => {
  it('ranks placed drinks closest first and leaves unplaced lines out', () => {
    let items: MenuItem[] = [];
    for (const line of ['Last Word', 'negroni', 'House Special']) items = addMenuLine(items, line, {});
    const ranked = rankMenu(items, you, [], 'Attaboy');
    expect(ranked).toHaveLength(2);
    expect(ranked[0].distance).toBeLessThanOrEqual(ranked[1].distance);
  });
});

describe('your menu', () => {
  const pour = (drink: string, hedonic: number, createdAt: string) => ({
    $type: 'app.cotidal.pour' as const,
    drink: { name: drink },
    rating: { hedonic },
    isHomePour: true,
    createdAt,
  });

  it('is ranked closest first', () => {
    const scored = scoreDrinks({ x: -4, y: -3, filters: [] }, undefined, []);
    const far = scored.map((d) => d.distance);
    expect(far).toEqual([...far].sort((a, b) => a - b));
  });

  it('lets the quiz\'s tags reorder only drinks about as close, never jump a band', () => {
    const user = { x: -1.4, y: 0, filters: [] };
    const scored = scoreDrinks(user, { crushable: 5, social: 3, classic: 2, bright: 4 }, []);
    const bands = scored.map((d) => Math.floor(calculateDistance(user, d) / RELEVANCE_BAND));
    expect(bands).toEqual([...bands].sort((a, b) => a - b));
  });

  it('leaves out what you avoid', () => {
    const scored = scoreDrinks({ x: -4, y: -3, filters: ['noSmoke', 'noBitter'] }, undefined, []);
    expect(scored.some((d) => d.hasSmoke || d.isBitter)).toBe(false);
  });

  it('reads a pour as the drink it means, not the name as typed', () => {
    // Saved as typed ("margarita") or under a house name with the slug: both are the Tommy's,
    // so a 2 takes it off the menu either way. Comparing raw names missed both.
    const user = { x: 6, y: 4, filters: [] };
    const typed = scoreDrinks(user, undefined, [pour('margarita', 2, '2026-11-02T00:00:00.000Z')]);
    expect(typed.some((d) => d.slug === 'margarita')).toBe(false);
    const house = { ...pour('Our Margarita', 2, '2026-11-02T00:00:00.000Z'), drink: { name: 'Our Margarita', slug: 'margarita' } };
    expect(scoreDrinks(user, undefined, [house]).some((d) => d.slug === 'margarita')).toBe(false);
  });

  it('leaves out a drink whose latest rating was 3 or lower, and keeps one rated up since', () => {
    const user = { x: -6, y: -8, filters: [] };
    const off = scoreDrinks(user, undefined, [pour('Negroni', 2, '2026-11-02T00:00:00.000Z'), pour('Negroni', 9, '2026-10-01T00:00:00.000Z')]);
    expect(off.some((d) => d.name === 'Negroni')).toBe(false);
    const back = scoreDrinks(user, undefined, [pour('Negroni', 8, '2026-11-03T00:00:00.000Z'), pour('Negroni', 2, '2026-11-02T00:00:00.000Z')]);
    expect(back.some((d) => d.name === 'Negroni')).toBe(true);
  });
});

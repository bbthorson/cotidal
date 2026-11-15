import { describe, expect, it } from 'vitest';
import { addMenuLine, rankMenu, type MenuItem } from '@/lib/menu-rank';

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
});

describe('rankMenu', () => {
  it('ranks placed drinks closest first and leaves unplaced lines out', () => {
    let items: MenuItem[] = [];
    for (const line of ['Last Word', 'negroni', 'House Special']) items = addMenuLine(items, line, {});
    const ranked = rankMenu(items, you, [], 'Attaboy');
    expect(ranked).toHaveLength(2);
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
  });
});

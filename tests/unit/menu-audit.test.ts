import { describe, expect, it } from 'vitest';
import { auditMenu, summarizeCoverage } from '@/lib/drinks/menu-audit';
import { addMenuLines } from '@/lib/drinks/menu-rank';

describe('auditMenu', () => {
  it('computes quadrant coverage, blind spots, and aversion exposure across catalog and directional drinks', () => {
    const result = auditMenu(
      [
        'Daiquiri $15',
        'Aperol Spritz $16',
        'Dry Martini $18',
        'House Smoke — mezcal, lime, agave',
        'Mystery Pour — secret house cordial',
      ].join('\n')
    );

    expect(result.placed).toHaveLength(4);
    expect(result.placed.filter((p) => p.source === 'catalog')).toHaveLength(3);
    expect(result.placed.filter((p) => p.source === 'directional')).toHaveLength(1);
    expect(result.unplaced).toHaveLength(1);
    expect(result.unplaced[0].label).toBe('Mystery Pour');

    const surf = result.coverage.find((c) => c.id === 'surf')!;
    const salt = result.coverage.find((c) => c.id === 'salt-line')!;
    expect(surf.count).toBe(3);
    expect(salt.count).toBe(1);

    // Deep and Eddy have zero placed drinks.
    expect(result.blindSpots.map((b) => b.id).sort()).toEqual(['deep', 'eddy']);

    // Aperol Spritz is bitter; House Smoke has mezcal (smoke).
    expect(result.aversionCounts).toEqual({ smoke: 1, bitter: 1, anise: 0 });
  });

  it('counts directional house cocktails in auditMenu and summarizeCoverage when catalog hits are zero', () => {
    const menu = [
      '## Les Martinis',
      'Blondeau Martini — gin, dry vermouth, olive brine · $20',
      '## Les Cocktails',
      'Midnight Bourbon — bourbon, Averna, honey, Angostura · $20',
      'Velvet Cacao — cognac, crème de cacao, espresso, cream · $20',
      'Wythe Spritz — Aperol, elderflower, grapefruit, prosecco · $19',
    ].join('\n');

    const audited = auditMenu(menu);
    expect(audited.placed).toHaveLength(4);
    expect(audited.placed.every((p) => p.source === 'directional')).toBe(true);
    expect(audited.blindSpots).toEqual([]);

    const items = addMenuLines([], menu, {});
    const summary = summarizeCoverage(items);
    expect(summary.placedCount).toBe(4);
    expect(summary.blindSpots).toEqual([]);
  });

  it('returns no blind spots when nothing is placed yet', () => {
    const result = auditMenu('Mystery Special');
    expect(result.placed).toHaveLength(0);
    expect(result.blindSpots).toEqual([]);
  });
});

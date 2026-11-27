import { describe, expect, it } from 'vitest';
import { auditMenu } from '@/lib/drinks/menu-audit';

describe('auditMenu', () => {
  it('computes quadrant coverage, blind spots, and aversion exposure', () => {
    const result = auditMenu(
      [
        'Daiquiri $15',
        'Aperol Spritz $16',
        'Dry Martini $18',
        'House Smoke — mezcal, lime, agave',
      ].join('\n')
    );

    expect(result.placed).toHaveLength(3);
    expect(result.unplaced).toHaveLength(1);

    const surf = result.coverage.find((c) => c.id === 'surf')!;
    const salt = result.coverage.find((c) => c.id === 'salt-line')!;
    expect(surf.count).toBe(2);
    expect(salt.count).toBe(1);

    // Deep and Eddy have zero placed drinks.
    expect(result.blindSpots.map((b) => b.id).sort()).toEqual(['deep', 'eddy']);

    // Aperol Spritz is bitter; House Smoke has mezcal (smoke).
    expect(result.aversionCounts).toEqual({ smoke: 1, bitter: 1, anise: 0 });
  });

  it('returns no blind spots when nothing is placed yet', () => {
    const result = auditMenu('Mystery Special');
    expect(result.placed).toHaveLength(0);
    expect(result.blindSpots).toEqual([]);
  });
});

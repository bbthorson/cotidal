import { describe, expect, it } from 'vitest';
import { analyzeVenuePours } from '@/lib/drinks/venue-analytics';
import type { PourRecord } from '@/lib/atproto/records';

const pour = (
  drink: string,
  hedonic: number,
  extra: { wouldOrderAgain?: boolean; deviations?: string[] } = {}
): PourRecord => ({
  $type: 'app.cotidal.pour',
  drink: { name: drink },
  rating: {
    hedonic,
    ...(typeof extra.wouldOrderAgain === 'boolean' ? { wouldOrderAgain: extra.wouldOrderAgain } : {}),
  },
  ...(extra.deviations ? { deviations: extra.deviations } : {}),
  createdAt: '2026-11-20T00:00:00.000Z',
});

describe('analyzeVenuePours', () => {
  it('computes quadrant density, reorder rate, and top deviations across patron pours', () => {
    const result = analyzeVenuePours([
      pour('Negroni', 8, { wouldOrderAgain: true }),
      pour('Negroni', 4, { wouldOrderAgain: false, deviations: ['too-bitter'] }),
      pour('Old Fashioned', 9, { wouldOrderAgain: true }),
      pour('Daiquiri', 7),
    ]);

    expect(result.totalPours).toBe(4);
    const deep = result.quadrantDensity.find((q) => q.id === 'deep')!;
    const surf = result.quadrantDensity.find((q) => q.id === 'surf')!;
    expect(deep.pours).toBe(3);
    expect(deep.percent).toBe(75);
    expect(surf.pours).toBe(1);
    expect(surf.percent).toBe(25);

    const negroni = result.drinks.find((d) => d.drink === 'Negroni')!;
    expect(negroni.pours).toBe(2);
    expect(negroni.averageHedonic).toBe(6);
    expect(negroni.reorderPercent).toBe(50);
    expect(negroni.topDeviations).toEqual([{ id: 'too-bitter', count: 1 }]);

    const daiquiri = result.drinks.find((d) => d.drink === 'Daiquiri (Classic)')!;
    expect(daiquiri.reorderPercent).toBeNull();
  });
});

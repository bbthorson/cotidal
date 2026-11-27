import type { PourRecord } from '../atproto/records';
import { drinkOf } from './search';
import { quadrantFor, type Quadrant } from '../map/coordinates';
import { quadrants } from '../copy';

/**
 * Palate Intelligence for bars (`docs/data-model.md`, Venues and Bars as spaces):
 * aggregates anonymous patron pours (from public pours naming the bar or from
 * the bar's `app.cotidal.bar` Space once the Spaces beta launches) into
 * quadrant density, per-drink re-order rates (`wouldOrderAgain`), and top
 * "what was off" signals.
 */

export interface DrinkReception {
  drink: string;
  pours: number;
  averageHedonic: number;
  /** Share of pours where `wouldOrderAgain` was explicitly answered true (0..100), or null if never asked. */
  reorderPercent: number | null;
  topDeviations: { id: string; count: number }[];
}

export interface QuadrantDensity {
  id: Quadrant['id'];
  name: string;
  pours: number;
  percent: number;
}

export interface VenueIntelligence {
  totalPours: number;
  quadrantDensity: QuadrantDensity[];
  drinks: DrinkReception[];
}

export function analyzeVenuePours(pours: readonly PourRecord[]): VenueIntelligence {
  const quadCounts = new Map<Quadrant['id'], number>(quadrants.map((q) => [q.id, 0]));
  let placedPours = 0;

  const byDrink = new Map<
    string,
    { name: string; hedonicSum: number; count: number; reorderYes: number; reorderAsked: number; devs: Map<string, number> }
  >();

  for (const p of pours) {
    const matched = drinkOf(p.drink);
    if (matched) {
      const q = quadrantFor(matched.x, matched.y);
      quadCounts.set(q.id, (quadCounts.get(q.id) ?? 0) + 1);
      placedPours += 1;
    }

    const displayName = matched?.name ?? p.drink.name;
    const key = displayName.toLowerCase();
    const bucket = byDrink.get(key) ?? {
      name: displayName,
      hedonicSum: 0,
      count: 0,
      reorderYes: 0,
      reorderAsked: 0,
      devs: new Map<string, number>(),
    };

    bucket.count += 1;
    bucket.hedonicSum += p.rating.hedonic;
    if (typeof p.rating.wouldOrderAgain === 'boolean') {
      bucket.reorderAsked += 1;
      if (p.rating.wouldOrderAgain) bucket.reorderYes += 1;
    }
    for (const d of p.deviations ?? []) {
      bucket.devs.set(d, (bucket.devs.get(d) ?? 0) + 1);
    }
    byDrink.set(key, bucket);
  }

  const quadrantDensity: QuadrantDensity[] = quadrants.map((q) => {
    const count = quadCounts.get(q.id) ?? 0;
    return {
      id: q.id,
      name: q.name,
      pours: count,
      percent: placedPours > 0 ? Math.round((count / placedPours) * 100) : 0,
    };
  });

  const drinks: DrinkReception[] = [...byDrink.values()]
    .map((b) => ({
      drink: b.name,
      pours: b.count,
      averageHedonic: Math.round((b.hedonicSum / b.count) * 10) / 10,
      reorderPercent: b.reorderAsked > 0 ? Math.round((b.reorderYes / b.reorderAsked) * 100) : null,
      topDeviations: [...b.devs.entries()]
        .map(([id, count]) => ({ id, count }))
        .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
        .slice(0, 3),
    }))
    .sort((a, b) => b.pours - a.pours || b.averageHedonic - a.averageHedonic);

  return { totalPours: pours.length, quadrantDensity, drinks };
}

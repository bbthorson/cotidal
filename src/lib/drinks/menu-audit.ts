import { addMenuLines, type MenuItem } from './menu-rank';
import {
  detectAversions,
  type AversionFlags,
  type DirectionalPlacement,
} from './ingredient-match';
import { quadrantFor, type Quadrant } from '../map/coordinates';
import { quadrants } from '../copy';
import type { Drink } from './data';
import type { Register } from './register';

/**
 * A bar's menu, audited: where its drinks sit on the chart, which regions are
 * covered, which are blind spots, and how many drinks carry smoke, bitterness,
 * or anise. Its page was retired for the map itself (a bar's pins show the
 * spread); kept as the rule a bar's card will summarise its menu by
 * (docs/map-first.md).
 */

export interface AuditedDrink {
  label: string;
  drink: Drink | null;
  directional?: DirectionalPlacement;
  region: Quadrant;
  source: 'catalog' | 'directional';
}

export interface AuditedUnplaced {
  label: string;
  description?: string;
  relative: Drink | null;
  aversions: AversionFlags;
}

export interface RegionCoverage {
  id: Quadrant['id'];
  name: string;
  axis: string;
  count: number;
  /** 0–100 integer share of placed drinks. */
  percent: number;
}

export interface MenuAuditResult {
  items: MenuItem[];
  placed: AuditedDrink[];
  unplaced: AuditedUnplaced[];
  coverage: RegionCoverage[];
  blindSpots: RegionCoverage[];
  aversionCounts: { smoke: number; bitter: number; anise: number };
}

export function auditMenu(block: string, register: Register = {}): MenuAuditResult {
  const items = addMenuLines([], block, register);
  const placed: AuditedDrink[] = [];
  const unplaced: AuditedUnplaced[] = [];
  const counts = new Map<Quadrant['id'], number>(quadrants.map((q) => [q.id, 0]));
  const aversionCounts = { smoke: 0, bitter: 0, anise: 0 };

  for (const item of items) {
    if (item.drink) {
      const region = quadrantFor(item.drink.x, item.drink.y);
      placed.push({ label: item.label, drink: item.drink, region, source: 'catalog' });
      counts.set(region.id, (counts.get(region.id) ?? 0) + 1);
      if (item.drink.hasSmoke) aversionCounts.smoke += 1;
      if (item.drink.isBitter) aversionCounts.bitter += 1;
      if (item.drink.hasAnise) aversionCounts.anise += 1;
    } else if (item.directional) {
      const region = quadrantFor(item.directional.x, item.directional.y);
      placed.push({
        label: item.label,
        drink: null,
        directional: item.directional,
        region,
        source: 'directional',
      });
      counts.set(region.id, (counts.get(region.id) ?? 0) + 1);
      if (item.directional.aversions.smoke) aversionCounts.smoke += 1;
      if (item.directional.aversions.bitter) aversionCounts.bitter += 1;
      if (item.directional.aversions.anise) aversionCounts.anise += 1;
    } else {
      const flags = detectAversions(`${item.label} ${item.description ?? ''}`);
      unplaced.push({
        label: item.label,
        ...(item.description ? { description: item.description } : {}),
        relative: item.relative ?? null,
        aversions: flags,
      });
      if (flags.smoke) aversionCounts.smoke += 1;
      if (flags.bitter) aversionCounts.bitter += 1;
      if (flags.anise) aversionCounts.anise += 1;
    }
  }

  const totalPlaced = placed.length;
  const coverage: RegionCoverage[] = quadrants.map((q) => {
    const count = counts.get(q.id) ?? 0;
    return {
      id: q.id,
      name: q.name,
      axis: q.axis,
      count,
      percent: totalPlaced > 0 ? Math.round((count / totalPlaced) * 100) : 0,
    };
  });

  const blindSpots = totalPlaced > 0 ? coverage.filter((c) => c.count === 0) : [];

  return { items, placed, unplaced, coverage, blindSpots, aversionCounts };
}

/**
 * Compact region footprint for an already-parsed `MenuItem[]` list (`MenuView`):
 * which regions the bar's placed drinks (catalog or directional) cover and
 * which are blind spots.
 */
export function summarizeCoverage(items: readonly MenuItem[]): {
  placedCount: number;
  coverage: RegionCoverage[];
  blindSpots: RegionCoverage[];
} {
  const counts = new Map<Quadrant['id'], number>(quadrants.map((q) => [q.id, 0]));
  let placedCount = 0;
  for (const item of items) {
    const point = item.drink ?? item.directional;
    if (!point) continue;
    const region = quadrantFor(point.x, point.y);
    counts.set(region.id, (counts.get(region.id) ?? 0) + 1);
    placedCount += 1;
  }
  const coverage: RegionCoverage[] = quadrants.map((q) => {
    const count = counts.get(q.id) ?? 0;
    return {
      id: q.id,
      name: q.name,
      axis: q.axis,
      count,
      percent: placedCount > 0 ? Math.round((count / placedCount) * 100) : 0,
    };
  });
  const blindSpots = placedCount > 0 ? coverage.filter((c) => c.count === 0) : [];
  return { placedCount, coverage, blindSpots };
}

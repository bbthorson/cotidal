import { describe, expect, test } from 'vitest';
import { drinkDatabase } from '@/lib/drinks/data';
import { addMenuLines } from '@/lib/drinks/menu-rank';
import { summarizeCoverage } from '@/lib/drinks/menu-audit';
import { readMapView, viewHref } from '@/lib/map/map-url';
import { buildTerrain, sampleTerrain } from '@/lib/palate/terrain';
import {
  exploreFrontier,
  filterDrinksByType,
  intersectGrounds,
  rankForTable,
  widestContrastPair,
  type TableMember,
} from '@/lib/palate/overlays';

const noAversions = { smoke: false, bitter: false, anise: false };

describe('intersectGrounds', () => {
  test('takes minimum rating and maximum sd at every grid cell', () => {
    const deep = sampleTerrain(buildTerrain({ x: -6, y: -6 }, []), 2);
    const surf = sampleTerrain(buildTerrain({ x: 6, y: 6 }, []), 2);
    const shared = intersectGrounds([deep, surf]);
    expect(shared).not.toBeNull();
    expect(shared!.step).toBe(2);
    expect(shared!.rows.length).toBe(deep.rows.length);
    for (let r = 0; r < deep.rows.length; r++) {
      for (let c = 0; c < deep.rows[r].length; c++) {
        expect(shared!.rows[r][c].rating).toBe(Math.min(deep.rows[r][c].rating, surf.rows[r][c].rating));
        expect(shared!.rows[r][c].sd).toBe(Math.max(deep.rows[r][c].sd, surf.rows[r][c].sd));
      }
    }
  });
});

describe('rankForTable & widestContrastPair', () => {
  const deep: TableMember = {
    id: 'deep',
    label: '@deep.test',
    terrain: buildTerrain({ x: -6, y: -6 }, []),
    aversions: { smoke: false, bitter: false, anise: false },
    rated: new Map([['Negroni', 9]]),
  };
  const surf: TableMember = {
    id: 'surf',
    label: '@surf.test',
    terrain: buildTerrain({ x: 6, y: 6 }, []),
    aversions: { smoke: true, bitter: true, anise: false },
    rated: new Map([['Daiquiri (Classic)', 9]]),
  };
  const middle: TableMember = {
    id: 'mid',
    label: '@mid.test',
    terrain: buildTerrain({ x: -4, y: -4 }, []),
    aversions: noAversions,
    rated: new Map(),
  };

  test('respects every member aversions and returns shared drinks', () => {
    const picks = rankForTable([deep, surf], drinkDatabase, 5);
    expect(picks.length).toBe(5);
    expect(picks.every((d) => !d.hasSmoke && !d.isBitter)).toBe(true);
  });

  test('identifies the widest contrast pair in a table of 3', () => {
    const contrast = widestContrastPair([deep, middle, surf]);
    expect(contrast).not.toBeNull();
    expect([contrast!.first, contrast!.second].sort()).toEqual(['@deep.test', '@surf.test']);
  });
});

describe('exploreFrontier', () => {
  test('excludes rated drinks and aversions, returning nearUntried and pastEdge', () => {
    const terrain = buildTerrain({ x: -5, y: -5 }, [
      { drink: { name: 'Negroni' }, rating: { hedonic: 9 } },
      { drink: { name: 'Manhattan' }, rating: { hedonic: 8 } },
    ]);
    const rated = new Map([
      ['Negroni', 9],
      ['Manhattan', 8],
    ]);
    const frontier = exploreFrontier(terrain, { smoke: true, bitter: false, anise: false }, rated, { x: -5, y: -5 });
    const all = [...frontier.nearUntried, ...frontier.pastEdge];
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((d) => !rated.has(d.name))).toBe(true);
    expect(all.every((d) => !d.hasSmoke)).toBe(true);
  });
});

describe('filterDrinksByType & summarizeCoverage', () => {
  test('filters by drink type cleanly', () => {
    const wines = filterDrinksByType(drinkDatabase, 'Wine');
    expect(wines.length).toBeGreaterThan(0);
    expect(wines.every((d) => d.type === 'Wine')).toBe(true);
  });

  test('summarizes region coverage and blind spots for a bar menu', () => {
    const items = addMenuLines([], 'Negroni\nManhattan\nDaiquiri', {});
    const summary = summarizeCoverage(items);
    expect(summary.placedCount).toBe(3);
    expect(summary.coverage.find((c) => c.id === 'deep')?.count).toBe(2);
    expect(summary.coverage.find((c) => c.id === 'surf')?.count).toBe(1);
    expect(summary.blindSpots.map((b) => b.id)).toContain('eddy');
  });
});

describe('map-url overlay params', () => {
  test('round-trips table, lens, and type params cleanly', () => {
    const href = viewHref('/map', {
      with: 'surf.test',
      table: ['deep.test', 'both.test', 'not a handle'],
      lens: 'explore',
      type: 'Wine',
    });
    expect(href).toBe('/map?with=surf.test&table=deep.test%2Cboth.test&lens=explore&type=wine');
    const parsed = readMapView(new URL(href, 'https://cotidal.app').searchParams);
    expect(parsed.with).toBe('surf.test');
    expect(parsed.table).toEqual(['deep.test', 'both.test']);
    expect(parsed.lens).toBe('explore');
    expect(parsed.type).toBe('Wine');
  });
});

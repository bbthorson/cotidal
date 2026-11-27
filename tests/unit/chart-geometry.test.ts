import { test, expect } from 'vitest';
import { band, cotidalLine, COTIDAL_LINES, HOUR_LINES, SECTORS, ringPoint, CENTRE } from '../../src/lib/map/chart-geometry';
import { quadrants } from '../../src/lib/copy';
import { quadrantIdFor } from '../../src/lib/map/coordinates';

/**
 * The chart's geometry is generated, not hand-placed. These hold the generator
 * to the six-line figure it replaced, and the four-line figure to the regions.
 */

test('Chart: the generator reproduces the six-line figure it replaced', () => {
  const six = [-80, -20, 40, 100, 160, 220].map((p) => cotidalLine(p).d);
  expect(six).toEqual([
    'M130 98 Q148.2 61.5 137.2 29.4',
    'M130 98 Q181.8 88.1 216.1 62.4',
    'M130 98 Q163.6 124.6 208.9 131',
    'M130 98 Q111.8 134.5 122.8 166.6',
    'M130 98 Q78.2 107.9 43.9 133.6',
    'M130 98 Q96.4 71.4 51.1 65',
  ]);
  expect(band(-80, -20)).toBe(
    'M130 98 Q148.2 61.5 137.2 29.4 A96 68 -8 0 1 216.1 62.4 Q181.8 88.1 130 98 Z'
  );
});

test('Chart: one sector per region, and each sector holds its region', () => {
  expect(COTIDAL_LINES).toHaveLength(quadrants.length);
  expect(Object.keys(SECTORS).sort()).toEqual(quadrants.map((q) => q.id).sort());

  for (const [id, { from, to }] of Object.entries(SECTORS)) {
    // Midway round the sector, near the centre, where the lines still run
    // along the axes. Screen y is down; the map's y (Sweet) is up.
    const p = ringPoint((from + to) / 2 + 16, 0.3);
    expect(quadrantIdFor(p.x - CENTRE.x, CENTRE.y - p.y), id).toBe(id);
  }
});

test('Chart: each line leaves the centre along an axis', () => {
  const axes = COTIDAL_LINES.map(({ param }) => {
    const { control } = cotidalLine(param);
    return [Math.round(control.x - CENTRE.x), Math.round(control.y - CENTRE.y)].map((n) =>
      Math.sign(n) || 0
    );
  });
  expect(axes).toEqual([
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ]);
});

test('Chart: an hour line for each hour, with the region boundaries as index lines', () => {
  expect(HOUR_LINES.map((l) => l.hour)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  expect(HOUR_LINES.filter((l) => l.index).map((l) => l.param)).toEqual(COTIDAL_LINES.map((l) => l.param));
  // The hairlines stay inside their sector, so no region gains a boundary.
  for (const [id, { from, to }] of Object.entries(SECTORS)) {
    const inside = HOUR_LINES.filter(({ param }) => {
      const p = param < from ? param + 360 : param;
      return p > from && p < to;
    });
    expect(inside, id).toHaveLength(2);
    expect(inside.every((l) => !l.index), id).toBe(true);
  }
});

import { describe, expect, test } from 'vitest';
import { inflateSync } from 'node:zlib';
import { contour, contourPath, groundShade, PLANE_EDGE, placeLabels, planePercent, type LabelWant } from '@/lib/map-draw';
import { groundMasks } from '@/lib/ground-masks';
import { buildTerrain, sampleTerrain } from '@/lib/terrain';

describe('contours', () => {
  test('a single hill gives a ring: every point on the line sits about as far from its top', () => {
    const t = buildTerrain({ x: 2, y: -3, variance: { x: 1, y: 1 } }, []);
    const { step, rows } = sampleTerrain(t, 0.5);
    const segments = contour(rows.map((r) => r.map((h) => h.rating)), step, 6.5);
    expect(segments.length).toBeGreaterThan(10);
    const radii = segments.flatMap(([x0, y0, x1, y1]) => [Math.hypot(x0 - 2, y0 + 3), Math.hypot(x1 - 2, y1 + 3)]);
    expect(Math.max(...radii) - Math.min(...radii)).toBeLessThan(0.6);
  });

  test('a level the ground never reaches draws nothing', () => {
    const t = buildTerrain({ x: 0, y: 0 }, []);
    const { step, rows } = sampleTerrain(t, 1);
    expect(contour(rows.map((r) => r.map((h) => h.rating)), step, 9.5)).toEqual([]);
  });
});

describe('labels', () => {
  const want = (id: string, x: number, priority: number, width = 60): LabelWant => ({ id, x, y: 100, width, height: 16, offset: 8, priority });
  const bounds = { x0: 0, y0: 0, x1: 400, y1: 400 };

  test('the more important label wins a contested place, and the other moves to the left or drops', () => {
    const placed = placeLabels([want('minor', 100, 1), want('major', 104, 10)], bounds);
    expect(placed[0]).toEqual(expect.objectContaining({ id: 'major', side: 'right' }));
    const minor = placed.find((p) => p.id === 'minor');
    if (minor) expect(minor.side).toBe('left');
  });

  test('no two labels overlap, and none crosses the edge or what is kept clear', () => {
    const wants = Array.from({ length: 40 }, (_, i) => want(`d${i}`, 20 + ((i * 37) % 360), i % 7, 50 + (i % 5) * 10));
    const clear = [{ x0: 180, y0: 80, x1: 220, y1: 120 }];
    const placed = placeLabels(wants, bounds, clear);
    const boxes = placed.map((p) => {
      const w = wants.find((x) => x.id === p.id)!;
      return { x0: p.x, x1: p.x + w.width, y0: p.y - 8, y1: p.y + 8 };
    });
    for (let a = 0; a < boxes.length; a++) {
      expect(boxes[a].x0).toBeGreaterThanOrEqual(0);
      expect(boxes[a].x1).toBeLessThanOrEqual(400);
      expect(boxes[a].x1 <= 180 || boxes[a].x0 >= 220).toBe(true);
      for (let b = a + 1; b < boxes.length; b++) {
        const hit = boxes[a].x0 < boxes[b].x1 && boxes[a].x1 > boxes[b].x0;
        expect(hit, `${placed[a].id} and ${placed[b].id}`).toBe(false);
      }
    }
  });

  test('a label that would run off the plane goes to the other side', () => {
    const [placed] = placeLabels([want('edge', 390, 1)], bounds);
    expect(placed.side).toBe('left');
  });
});

describe('drawn to scale', () => {
  test('a coordinate sits in the plane box by percent: the centre in the middle, up is sweet', () => {
    expect(planePercent(0, 0)).toEqual({ left: 50, top: 50 });
    expect(planePercent(-PLANE_EDGE, PLANE_EDGE)).toEqual({ left: 0, top: 0 });
    expect(planePercent(PLANE_EDGE, -PLANE_EDGE)).toEqual({ left: 100, top: 100 });
    expect(planePercent(0, 5).top).toBeLessThan(50);
  });

  test("a contour's path is the same line in the viewBox, y flipped", () => {
    const t = buildTerrain({ x: 2, y: -3, variance: { x: 1, y: 1 } }, []);
    const { step, rows } = sampleTerrain(t, 0.5);
    const ratings = rows.map((r) => r.map((h) => h.rating));
    const d = contourPath(ratings, step, 6.5);
    const first = contour(ratings, step, 6.5)[0];
    expect(d.startsWith(`M${first[0].toFixed(2)},${(-first[1]).toFixed(2)}`)).toBe(true);
  });

  test('the shading: sage on high ground, forest near the top, terracotta in a hollow, paler where unsupported', () => {
    expect(groundShade({ rating: 5, sd: 0 })).toEqual({ rise: 0, top: 0, low: 0 });
    const high = groundShade({ rating: 8.8, sd: 0 });
    expect(high.rise).toBeCloseTo(0.9);
    expect(high.top).toBeGreaterThan(0);
    expect(groundShade({ rating: 3, sd: 0 }).low).toBeCloseTo(0.28);
    expect(groundShade({ rating: 8.8, sd: 3 }).rise).toBeLessThan(high.rise);
  });

  test('the masks are PNGs the server can write, one opacity per sample, the map\'s top row first', () => {
    const t = buildTerrain({ x: 0, y: 8, variance: { x: 1, y: 1 } }, []);
    const { rows } = sampleTerrain(t, 1);
    const { rise } = groundMasks(rows);
    const png = Buffer.from(rise.slice('data:image/png;base64,'.length), 'base64');
    expect([...png.subarray(1, 4)].map((c) => String.fromCharCode(c)).join('')).toBe('PNG');
    // IHDR: width and height, 8-bit grey with alpha.
    expect(png.readUInt32BE(16)).toBe(rows[0].length);
    expect(png.readUInt32BE(20)).toBe(rows.length);
    expect(png[25]).toBe(4);
    const idat = png.indexOf('IDAT');
    const raw = inflateSync(png.subarray(idat + 4, idat + 4 + png.readUInt32BE(idat - 4)));
    const row = 1 + 2 * rows[0].length;
    const alphaAt = (i: number, j: number) => raw[j * row + 2 + 2 * i];
    // The hill is at y = 8: near the image's top, not its foot.
    const mid = (rows[0].length - 1) / 2;
    expect(alphaAt(mid, 2)).toBeGreaterThan(alphaAt(mid, rows.length - 3));
    expect(alphaAt(mid, 2)).toBe(Math.round(groundShade(rows[rows.length - 3][mid]).rise * 255));
  });
});

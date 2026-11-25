import { describe, expect, test } from 'vitest';
import { contour, fitPlane, PLANE_EDGE, placeLabels, toScreen, type LabelWant } from '@/lib/map-draw';
import { buildTerrain, sampleTerrain } from '@/lib/terrain';

describe('the plane', () => {
  test('is the largest square that fits, centred, and a coordinate lands where the scale says', () => {
    const fit = fitPlane({ left: 0, top: 64, width: 390, height: 500 });
    expect(fit.scale * 2 * PLANE_EDGE).toBeCloseTo(390, 9);
    expect(toScreen(fit, 0, 0)).toEqual({ x: 195, y: 64 + 250 });
    // Up on the map is up on the screen.
    expect(toScreen(fit, 0, 5).y).toBeLessThan(toScreen(fit, 0, -5).y);
    expect(toScreen(fit, 5, 0).x).toBeGreaterThan(toScreen(fit, -5, 0).x);
  });
});

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

/**
 * Drawing the map, as plain functions: where the plane sits on the screen,
 * the contour lines of your terrain, and which drinks get a label. The map
 * itself (`PalateMap.tsx`) only draws what these answer; they are tested in
 * `tests/unit/map-draw.test.ts`.
 */

/** The plane reaches this far past ±10, so a drink at the edge is drawn whole. */
export const PLANE_EDGE = 10.6;

/** Where the plane sits in a box on the screen: its centre and how many pixels one map point is. */
export interface PlaneFit {
  /** Pixels per map point. */
  scale: number;
  /** Screen position of the map's centre (0, 0). */
  cx: number;
  cy: number;
}

/** The largest square plane that fits a box, centred in it. The plane never moves once placed. */
export function fitPlane(box: { left: number; top: number; width: number; height: number }): PlaneFit {
  const side = Math.max(0, Math.min(box.width, box.height));
  return { scale: side / (2 * PLANE_EDGE), cx: box.left + box.width / 2, cy: box.top + box.height / 2 };
}

/** A map coordinate on the screen (y up on the map, down on the screen). */
export const toScreen = (fit: PlaneFit, x: number, y: number) => ({ x: fit.cx + x * fit.scale, y: fit.cy - y * fit.scale });

/** One stretch of a contour line, in map coordinates. */
export type Segment = readonly [x0: number, y0: number, x1: number, y1: number];

/**
 * A contour line through a grid of heights, by marching squares: `rows[j][i]`
 * is the height at x = −10 + i·step, y = −10 + j·step (as `sampleTerrain`
 * returns it). Each grid cell the level crosses gives one segment, or two
 * where the level crosses all four sides; they are not joined into paths,
 * which a drawing does not need.
 */
export function contour(rows: readonly (readonly number[])[], step: number, level: number): Segment[] {
  const out: Segment[] = [];
  const at = (i: number, j: number) => [-10 + i * step, -10 + j * step] as const;
  for (let j = 0; j + 1 < rows.length; j++) {
    for (let i = 0; i + 1 < rows[j].length; i++) {
      const corners = [
        [i, j],
        [i + 1, j],
        [i + 1, j + 1],
        [i, j + 1],
      ] as const;
      const v = corners.map(([ci, cj]) => rows[cj][ci]);
      const crossings: [number, number][] = [];
      for (let e = 0; e < 4; e++) {
        const a = v[e];
        const b = v[(e + 1) % 4];
        if (a >= level === b >= level) continue;
        const t = (level - a) / (b - a);
        const [ax, ay] = at(...corners[e]);
        const [bx, by] = at(...corners[(e + 1) % 4]);
        crossings.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
      }
      if (crossings.length >= 2) out.push([...crossings[0], ...crossings[1]]);
      if (crossings.length === 4) out.push([...crossings[2], ...crossings[3]]);
    }
  }
  return out;
}

/** Something that wants a label: where its mark is on the screen, how wide its label is, how much it matters. */
export interface LabelWant {
  id: string;
  /** The mark's centre, in screen pixels. */
  x: number;
  y: number;
  /** The label's width and height, in pixels. */
  width: number;
  height: number;
  /** How far from the mark's centre the label starts, in pixels. */
  offset: number;
  /** Higher is placed first. */
  priority: number;
}

export interface PlacedLabel {
  id: string;
  /** Where the text starts (its left edge) and its baseline's middle, in pixels. */
  x: number;
  y: number;
  side: 'right' | 'left';
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

/**
 * Which labels to draw, and on which side: most important first, to the right
 * of the mark if it fits and to the left if not, never over another label or
 * anything in `keepClear` (your mark, say), and never past `bounds`. A label
 * that fits nowhere is left out; its drink is still in the card's lists.
 */
export function placeLabels(wants: readonly LabelWant[], bounds: Box, keepClear: readonly Box[] = []): PlacedLabel[] {
  const taken: Box[] = [...keepClear];
  const placed: PlacedLabel[] = [];
  for (const w of [...wants].sort((a, b) => b.priority - a.priority)) {
    for (const side of ['right', 'left'] as const) {
      const x = side === 'right' ? w.x + w.offset : w.x - w.offset - w.width;
      const box = { x0: x - 2, y0: w.y - w.height / 2, x1: x + w.width + 2, y1: w.y + w.height / 2 };
      if (box.x0 < bounds.x0 || box.x1 > bounds.x1 || box.y0 < bounds.y0 || box.y1 > bounds.y1) continue;
      if (taken.some((t) => overlaps(t, box))) continue;
      taken.push(box);
      placed.push({ id: w.id, x, y: w.y, side });
      break;
    }
  }
  return placed;
}

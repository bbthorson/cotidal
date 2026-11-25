/**
 * Drawing the map, as plain functions: where a coordinate sits on the plane,
 * the contour lines and shading of your terrain, and which drinks get a label. The map
 * itself (`PalateMap.tsx`) only draws what these answer; they are tested in
 * `tests/unit/map-draw.test.ts`.
 */

/** The plane reaches this far past ±10, so a drink at the edge is drawn whole. */
export const PLANE_EDGE = 10.6;

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
  /**
   * Gives way to the other drinks' marks as well as to labels: a name drawn
   * only to show what is near (a drink page's neighbours), which is not worth
   * covering a drink for. The open drink, pins and your pours do not yield.
   */
  yields?: boolean;
}

export interface PlacedLabel {
  id: string;
  /** Where the text starts (its left edge) and its baseline's middle, in pixels. */
  x: number;
  y: number;
  side: 'right' | 'left';
}

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

/**
 * Which labels to draw, and on which side: most important first, to the right
 * of the mark if it fits and to the left if not, never over another label or
 * anything in `keepClear`, and never past `bounds`. A label that `yields`
 * also stays off every box in `yieldTo` (the region names, the other drinks'
 * marks). A label that
 * fits nowhere is left out; its drink is still in the card's lists.
 */
export function placeLabels(
  wants: readonly LabelWant[],
  bounds: Box,
  keepClear: readonly Box[] = [],
  yieldTo: readonly Box[] = []
): PlacedLabel[] {
  const taken: Box[] = [...keepClear];
  const placed: PlacedLabel[] = [];
  for (const w of [...wants].sort((a, b) => b.priority - a.priority)) {
    for (const side of ['right', 'left'] as const) {
      const x = side === 'right' ? w.x + w.offset : w.x - w.offset - w.width;
      const box = { x0: x - 2, y0: w.y - w.height / 2, x1: x + w.width + 2, y1: w.y + w.height / 2 };
      if (box.x0 < bounds.x0 || box.x1 > bounds.x1 || box.y0 < bounds.y0 || box.y1 > bounds.y1) continue;
      if (taken.some((t) => overlaps(t, box))) continue;
      if (w.yields && yieldTo.some((t) => overlaps(t, box))) continue;
      taken.push(box);
      placed.push({ id: w.id, x, y: w.y, side });
      break;
    }
  }
  return placed;
}

/*
 * The map drawn to scale with its box. The plane is one SVG whose viewBox is
 * the map itself (`PLANE_VIEWBOX`, y flipped so up is sweet), so the server
 * can draw it at any size, and what must stay one size on the screen —
 * marks, labels, region names — is laid over it in percentages
 * (`planePercent`). Nothing here needs the box's size in pixels except which
 * labels fit (`placeLabels`), which the server answers for `NOMINAL_SIDE`.
 */

/** The plane's viewBox: map units, the centre at (0, 0), screen y = −map y. */
export const PLANE_VIEWBOX = `${-PLANE_EDGE} ${-PLANE_EDGE} ${2 * PLANE_EDGE} ${2 * PLANE_EDGE}`;

/**
 * The plane's side assumed before it is measured: on the server, and on a page
 * with no script, where it is never measured. A phone's width, so labels the
 * server places do not collide on the smallest screen; a wider plane only
 * spreads them out.
 */
export const NOMINAL_SIDE = 360;

/** Where a map coordinate sits in the plane's box, in percent from its left and top edges. */
export const planePercent = (x: number, y: number) => ({
  left: ((x + PLANE_EDGE) / (2 * PLANE_EDGE)) * 100,
  top: ((PLANE_EDGE - y) / (2 * PLANE_EDGE)) * 100,
});

/** A contour line as an SVG path in the plane's viewBox. */
export function contourPath(rows: readonly (readonly number[])[], step: number, level: number): string {
  return contour(rows, step, level)
    .map(([x0, y0, x1, y1]) => `M${x0.toFixed(2)},${(-y0).toFixed(2)}L${x1.toFixed(2)},${(-y1).toFixed(2)}`)
    .join('');
}

/**
 * How strongly the ground is shaded at one sample, 0 to 1 for each wash: sage
 * where it rises above 5.5, forest over that near the top, terracotta below
 * 4.5 — each paler where `sd` says nothing rated supports it.
 */
export function groundShade({ rating, sd }: { rating: number; sd: number }): { rise: number; top: number; low: number } {
  const sure = Math.max(0.3, 1 - sd / 3.5);
  if (rating >= 5.5) {
    const rise = Math.min(1, (rating - 5.5) / 3.3);
    return { rise: Math.min(0.9, rise * 1.4) * sure, top: rise > 0.45 ? (rise - 0.45) * 0.7 * sure : 0, low: 0 };
  }
  if (rating < 4.5) return { rise: 0, top: 0, low: Math.min(1, (4.5 - rating) / 1.5) * 0.28 * sure };
  return { rise: 0, top: 0, low: 0 };
}

/**
 * The drinks nearest a drink on the map, nearest first, ties by name so a
 * page draws the same ones every time: the neighbours a drink's page names.
 */
export function neighboursOf<D extends { name: string; x: number; y: number }>(drink: D, drinks: readonly D[], count = 5): D[] {
  return drinks
    .filter((d) => d.name !== drink.name)
    .map((d) => ({ d, distance: Math.hypot(d.x - drink.x, d.y - drink.y) }))
    .sort((a, b) => a.distance - b.distance || a.d.name.localeCompare(b.d.name))
    .slice(0, count)
    .map(({ d }) => d);
}

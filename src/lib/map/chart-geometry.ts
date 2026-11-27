import type { QuadrantId } from './coordinates';

/**
 * The cotidal chart's geometry, in one place: the landing figure draws it,
 * and the coaster will (docs/coasters.md). Two hand-placed copies would drift.
 *
 * Rings are ellipses about the centre, tilted. A point is named by its
 * parameter on those ellipses (degrees; increasing runs clockwise on screen)
 * and a scale (1 is the outer ring). Each cotidal line is a quadratic from the
 * centre to the outer ring, its control point `SWEEP` degrees ahead at
 * `REACH` of the way out, so the lines sweep the way an amphidromic system
 * rotates. Everything is rounded to 0.1, which is what the SVG carries.
 */

export const CENTRE = { x: 130, y: 98 } as const;
export const TILT = -8;
export const RINGS = [
  { rx: 34, ry: 24 },
  { rx: 64, ry: 45 },
  { rx: 96, ry: 68 },
] as const;
const OUTER = RINGS[RINGS.length - 1];
const SWEEP = 16;
const REACH = 0.55;

type Point = { x: number; y: number };

const rad = (deg: number) => (deg * Math.PI) / 180;
const round = (n: number) => Math.round(n * 10) / 10;
const fmt = (p: Point) => `${round(p.x)} ${round(p.y)}`;

/** A point at `param` degrees around the outer ring, scaled toward the centre. */
export function ringPoint(param: number, scale = 1): Point {
  const ux = OUTER.rx * scale * Math.cos(rad(param));
  const uy = OUTER.ry * scale * Math.sin(rad(param));
  const t = rad(TILT);
  return {
    x: CENTRE.x + ux * Math.cos(t) - uy * Math.sin(t),
    y: CENTRE.y + ux * Math.sin(t) + uy * Math.cos(t),
  };
}

/** The parameter whose point lies in screen direction `deg` from the centre. */
export function paramToward(deg: number): number {
  const t = rad(-TILT);
  const dx = Math.cos(rad(deg));
  const dy = Math.sin(rad(deg));
  const ux = dx * Math.cos(t) - dy * Math.sin(t);
  const uy = dx * Math.sin(t) + dy * Math.cos(t);
  return (Math.atan2(uy / OUTER.ry, ux / OUTER.rx) * 180) / Math.PI;
}

export interface CotidalLine {
  end: Point;
  control: Point;
  d: string;
}

/** A cotidal line ending at `param` on the outer ring. */
export function cotidalLine(param: number): CotidalLine {
  const end = ringPoint(param);
  const control = ringPoint(param + SWEEP, REACH);
  return { end, control, d: `M${fmt(CENTRE)} Q${fmt(control)} ${fmt(end)}` };
}

/** The band between two cotidal lines, closed along the outer ring. */
export function band(from: number, to: number): string {
  const a = cotidalLine(from);
  const b = cotidalLine(to);
  const large = to - from > 180 ? 1 : 0;
  return (
    `M${fmt(CENTRE)} Q${fmt(a.control)} ${fmt(a.end)} ` +
    `A${OUTER.rx} ${OUTER.ry} ${TILT} ${large} 1 ${fmt(b.end)} ` +
    `Q${fmt(b.control)} ${fmt(CENTRE)} Z`
  );
}

/** Where an hour label sits: just past the line's end, away from the centre. */
export function labelPoint(param: number): Point {
  const { end } = cotidalLine(param);
  const dx = end.x - CENTRE.x;
  const dy = end.y - CENTRE.y;
  const len = Math.hypot(dx, dy);
  // 9 out from the ring, then down 2.8 so 8px text centres on the line.
  return { x: round(end.x + (9 * dx) / len), y: round(end.y + (9 * dy) / len + 2.8) };
}

/**
 * Four cotidal lines, one per region boundary. Each leaves the centre along
 * one of the map's axes — its control point sits on the axis, so the line's
 * tangent there is the axis — and sweeps away from it toward the ring.
 * A semidiurnal tide, so three hours apart. Screen angles: up, right, down,
 * left; the y axis points up the map (Sweet) and down the screen.
 */
export const COTIDAL_LINES = [-90, 0, 90, 180].map((axis, i) => ({
  hour: i * 3,
  param: paramToward(axis) - SWEEP,
}));

/**
 * The region between each line and the next, clockwise. Up→right is crisp
 * and sweet; signs as in `quadrant.ts`.
 */
export const SECTORS: Record<QuadrantId, { from: number; to: number }> = (() => {
  const p = COTIDAL_LINES.map((l) => l.param);
  const next = (i: number) => (p[(i + 1) % 4] <= p[i] ? p[(i + 1) % 4] + 360 : p[(i + 1) % 4]);
  return {
    surf: { from: p[0], to: next(0) },
    'salt-line': { from: p[1], to: next(1) },
    deep: { from: p[2], to: next(2) },
    eddy: { from: p[3], to: next(3) },
  };
})();

/**
 * Every hour of the semidiurnal tide, 0h to 11h, as a real cotidal chart
 * draws them. The four region boundaries (`COTIDAL_LINES`) are the index
 * lines, as on a contour map: every third line, heavier and labelled. The
 * two between each pair are spaced evenly round the sector, so they divide
 * a region without making new ones. Only the landing figure draws these;
 * the mark and the coaster keep the four, which survive being small.
 */
export const HOUR_LINES: readonly { hour: number; param: number; index: boolean }[] = COTIDAL_LINES.flatMap(
  ({ hour, param }, i) => {
    const next = COTIDAL_LINES[(i + 1) % COTIDAL_LINES.length].param;
    const to = next <= param ? next + 360 : next;
    return [0, 1, 2].map((k) => ({ hour: hour + k, param: param + (k * (to - param)) / 3, index: k === 0 }));
  }
);

/**
 * The mark: this chart reduced to a true circular disc (a precision dial),
 * keeping the four region-boundary phase lines with a gentler sweep so they
 * read as radiating lines from an amphidrome rather than seams on a sphere.
 * The header, the favicon, the touch icon and the PWA icons all draw it
 * (`src/lib/mark.ts`).
 */
export const MARK_RADIUS = 104;
const MARK_SWEEP = 9;
const MARK_REACH = 0.56;

/** The band the landing figure and the mark both fill: crisp and sweet, The Surf. */
export const FILLED_REGION: QuadrantId = 'surf';

export interface MarkGeometry {
  /** Square, centred on the amphidrome, with room for a stroke of `pad`. */
  viewBox: string;
  cx: number;
  cy: number;
  radius: number;
  innerRadius: number;
  ring: string;
  lines: string[];
  band: string;
}

export function markGeometry(pad: number): MarkGeometry {
  const r = MARK_RADIUS;
  const half = Math.ceil(r + pad);
  const pt = (deg: number, scale = 1): Point => ({
    x: CENTRE.x + r * scale * Math.cos(rad(deg)),
    y: CENTRE.y + r * scale * Math.sin(rad(deg)),
  });
  const axes = [-90, 0, 90, 180];
  const segments = axes.map((axis) => {
    const control = pt(axis, MARK_REACH);
    const end = pt(axis - MARK_SWEEP, 1);
    return { control, end, d: `M${fmt(CENTRE)} Q${fmt(control)} ${fmt(end)}` };
  });
  // The Surf is between 0h (-90°) and 3h (0°).
  const a = segments[0];
  const b = segments[1];
  const top = { x: CENTRE.x, y: CENTRE.y - r };
  const bottom = { x: CENTRE.x, y: CENTRE.y + r };
  return {
    viewBox: `${CENTRE.x - half} ${CENTRE.y - half} ${2 * half} ${2 * half}`,
    cx: CENTRE.x,
    cy: CENTRE.y,
    radius: r,
    innerRadius: round(r * 0.54),
    ring: `M${fmt(top)} A${r} ${r} 0 1 1 ${fmt(bottom)} A${r} ${r} 0 1 1 ${fmt(top)} Z`,
    lines: segments.map((s) => s.d),
    band:
      `M${fmt(CENTRE)} Q${fmt(a.control)} ${fmt(a.end)} ` +
      `A${r} ${r} 0 0 1 ${fmt(b.end)} ` +
      `Q${fmt(b.control)} ${fmt(CENTRE)} Z`,
  };
}

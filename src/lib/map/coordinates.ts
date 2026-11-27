import { axes, quadrants } from '../copy';

/**
 * Coordinates, formatting, and quadrant/region geometry.
 *
 * x runs Rich (−10) to Crisp (+10); y runs Savory (−10) to Sweet (+10).
 * Region names themselves live in `src/lib/copy.ts` so the voice stays
 * revisable in one file (docs/brand.md, rule 2).
 */

export type QuadrantId = (typeof quadrants)[number]['id'];
export type Quadrant = (typeof quadrants)[number];

/** Sign of x (Rich −10 → Crisp +10) and y (Savory −10 → Sweet +10). */
const BY_SIGN: Record<'crisp' | 'rich', Record<'sweet' | 'savory', QuadrantId>> = {
  rich: { savory: 'deep', sweet: 'eddy' },
  crisp: { savory: 'salt-line', sweet: 'surf' },
};

/**
 * Zero sits on an axis rather than in a quadrant. Ties break toward crisp and
 * sweet so every drink lands somewhere.
 */
export function quadrantIdFor(x: number, y: number): QuadrantId {
  return BY_SIGN[x < 0 ? 'rich' : 'crisp'][y < 0 ? 'savory' : 'sweet'];
}

export function quadrantFor(x: number, y: number): Quadrant {
  const id = quadrantIdFor(x, y);
  const quadrant = quadrants.find((q) => q.id === id);
  if (!quadrant) throw new Error(`No quadrant named '${id}' in copy.ts`);
  return quadrant;
}

/** Reading order on the map, as listed in `copy.ts`. */
export const QUADRANT_ORDER: readonly QuadrantId[] = quadrants.map((q) => q.id);

/**
 * A region is a filter on the map: `/map?region=<id>` washes it, names its
 * drinks, and puts the region in the card (`map-url.ts`, `VIEW_PARAMS.region`).
 */
export const regionPath = (id: QuadrantId) => `/map?region=${id}`;

const MINUS = '−';

/** To one decimal, as written: −0.04 is 0.0, not "−0.0". */
const tenths = (value: number) => Math.round(value * 10) / 10 || 0;

function signed(value: number): string {
  const v = tenths(value);
  const abs = Math.abs(v).toFixed(1);
  if (v < 0) return `${MINUS}${abs}`;
  if (v > 0) return `+${abs}`;
  return abs;
}

/** "Rich −3.8" — the pole the value leans toward, then the value. */
export function formatAxis(value: number, axis: 'x' | 'y'): string {
  const [low, high] = axis === 'x' ? [axes.rich, axes.crisp] : [axes.savory, axes.sweet];
  const v = tenths(value);
  // On the axis it leans neither way, so it names both: "Savory–Sweet 0.0", not "Sweet 0.0".
  const pole = v < 0 ? low : v > 0 ? high : `${low}–${high}`;
  return `${pole} ${signed(value)}`;
}

/** "−3.8 · −2.6" */
export function formatCoordinate(x: number, y: number): string {
  return `${signed(x)} · ${signed(y)}`;
}

/** Range −10…10 mapped to 0…100 (%), clamped so a mark never leaves the map. */
export function toPercent(value: number): number {
  return Math.max(0, Math.min(100, ((value + 10) / 20) * 100));
}

/**
 * One plain sentence for a move after a pour: "A little crisper, a little
 * sweeter." Movements under a tenth of a point are not worth naming.
 */
export function describeMove(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const parts: string[] = [];
  if (Math.abs(dx) >= 0.1) parts.push(dx > 0 ? 'a little crisper' : 'a little richer');
  if (Math.abs(dy) >= 0.1) parts.push(dy > 0 ? 'a little sweeter' : 'a little more savory');
  if (parts.length === 0) return 'Barely a step.';
  const sentence = parts.join(', ');
  return `${sentence[0].toUpperCase()}${sentence.slice(1)}.`;
}

export function regionName(x: number, y: number): string {
  return quadrantFor(x, y).name;
}

/** Round to one decimal place (avoiding −0). */
export function roundTenth(value: number): number {
  return Math.round(value * 10) / 10 || 0;
}

/** Euclidean distance between two map points, rounded to a tenth. */
export function distanceBetween(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return roundTenth(Math.hypot(b.x - a.x, b.y - a.y));
}

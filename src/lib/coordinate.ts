import { quadrantFor } from './quadrant';
import { axes } from './copy';

/**
 * How a coordinate is written in the interface. x runs Rich (−10) to Crisp
 * (+10); y runs Savory (−10) to Sweet (+10). See src/lib/data.ts.
 */

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

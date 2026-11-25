import { groundShade } from './map-draw';
import { alphaPng } from './png';

/**
 * The terrain's three washes as alpha masks, one pixel per sample, for
 * the map to fill through with token colours (`PalateMap`): drawing colour on
 * the server would mean knowing the theme, and a mask does not. The browser
 * smooths each one as it scales it up, as it did the canvas image this
 * replaced. Row 0 of `rows` is the bottom of the map (y = −10); row 0 of an
 * image is its top, so rows are flipped here.
 */
export function groundMasks(rows: readonly (readonly { rating: number; sd: number }[])[]): { rise: string; top: string; low: string } {
  const n = rows.length;
  const m = rows[0]?.length ?? 0;
  const rise = new Uint8Array(n * m);
  const top = new Uint8Array(n * m);
  const low = new Uint8Array(n * m);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < m; i++) {
      const s = groundShade(rows[j][i]);
      const k = (n - 1 - j) * m + i;
      rise[k] = Math.round(s.rise * 255);
      top[k] = Math.round(s.top * 255);
      low[k] = Math.round(s.low * 255);
    }
  }
  return { rise: alphaPng(m, n, rise), top: alphaPng(m, n, top), low: alphaPng(m, n, low) };
}

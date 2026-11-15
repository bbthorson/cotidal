/**
 * Where a wine or beer sits on the map, from three things said about its
 * style rather than two numbers picked by eye.
 *
 * The first 94 drinks were placed by hand. Placing more the same way does not
 * scale and cannot be reviewed: a coordinate says nothing about why. So a
 * style is described by
 *
 * - `body` — weight in the mouth, on the five steps of a tasting grid
 *   (1 light, 2 medium−, 3 medium, 4 medium+, 5 full);
 * - `residualSugarGpl` — residual sugar in g/L, typical for the style
 *   (the same unit as `residualSugarGpl` in `app.cotidal.defs#stimulus`);
 * - `structure` — what grips and dries, 0–4: tannin in a wine, hop
 *   bitterness in a beer;
 *
 * and the coordinate is computed from them by `placeStyle`. Its coefficients
 * are a least-squares fit to the wines and beers already placed by hand
 * (`CALIBRATION`), so a new style lands where the hand placements would have
 * put it. `tests/unit/placement.test.ts` refits them and fails if they drift.
 *
 * What the fit found, which is worth knowing before changing it:
 * - Rich ↔ Crisp is body. Acidity and alcohol, tried as inputs, explained
 *   less than body alone, and acidity came out with the wrong sign.
 * - Savory ↔ Sweet is sugar on a log scale (each doubling is a step), less
 *   for structure: tannin and bitterness read as savory.
 * - Across the 15 it misses a hand placement by 2.9 points (RMS, 2D, on a
 *   plane 20 wide). The largest misses are Late-Harvest Riesling, Fino and
 *   Smoked Porter, where the hand placement leaned on something the three
 *   inputs do not carry (botrytis richness, flor, smoke).
 *
 * The profiles are typical figures for the style, not measurements of a
 * bottle; check them against the appellation rules or a producer's spec
 * before a drink is written up (`src/content/drinks/`).
 */

export interface StyleProfile {
  /** 1 light … 5 full. */
  body: 1 | 2 | 3 | 4 | 5;
  /** Residual sugar, g/L, typical for the style. */
  residualSugarGpl: number;
  /** Tannin (wine) or hop bitterness (beer), 0 none … 4 high. */
  structure: 0 | 1 | 2 | 3 | 4;
}

/** x = X[0] + X[1]·body */
export const X_COEFFICIENTS = [13.58, -4.56] as const;
/** y = Y[0] + Y[1]·log2(1 + sugar) + Y[2]·structure */
export const Y_COEFFICIENTS = [-7.5, 2.17, -0.79] as const;

/** Within the plane, and never `-0`, which reads as a different point to `Object.is`. */
const clamp = (v: number) => Math.max(-10, Math.min(10, v)) || 0;

/** The unrounded coordinate a profile implies. */
export function rawPlacement(p: StyleProfile): { x: number; y: number } {
  return {
    x: X_COEFFICIENTS[0] + X_COEFFICIENTS[1] * p.body,
    y: Y_COEFFICIENTS[0] + Y_COEFFICIENTS[1] * Math.log2(1 + p.residualSugarGpl) + Y_COEFFICIENTS[2] * p.structure,
  };
}

/** The coordinate on the map: whole points, as the hand placements are, within the plane. */
export function placeStyle(p: StyleProfile): { x: number; y: number } {
  const { x, y } = rawPlacement(p);
  return { x: clamp(Math.round(x)), y: clamp(Math.round(y)) };
}

/**
 * The hand-placed wines and beers, described the same way: what the
 * coefficients were fitted to. Keyed by `name` in `drinkDatabase`; their
 * coordinates there stay as placed, and the test reads them from the map.
 */
export const CALIBRATION: Record<string, StyleProfile> = {
  'German Riesling (Kabinett)': { body: 1, residualSugarGpl: 35, structure: 0 },
  "Moscato d'Asti": { body: 1, residualSugarGpl: 120, structure: 0 },
  'Port (Tawny)': { body: 5, residualSugarGpl: 100, structure: 1 },
  'Pedro Ximénez Sherry': { body: 5, residualSugarGpl: 400, structure: 0 },
  Sauternes: { body: 5, residualSugarGpl: 130, structure: 0 },
  'Late-Harvest Riesling': { body: 4, residualSugarGpl: 100, structure: 0 },
  'Sherry (Fino)': { body: 1, residualSugarGpl: 1, structure: 0 },
  'Sauvignon Blanc (Sancerre)': { body: 2, residualSugarGpl: 2, structure: 0 },
  'Barolo (Nebbiolo)': { body: 5, residualSugarGpl: 1, structure: 4 },
  'Syrah (Northern Rhône)': { body: 4, residualSugarGpl: 1.5, structure: 3 },
  'Milk Stout': { body: 4, residualSugarGpl: 30, structure: 1 },
  'Pilsner Urquell': { body: 2, residualSugarGpl: 2, structure: 3 },
  Gose: { body: 1, residualSugarGpl: 1, structure: 0 },
  Guinness: { body: 4, residualSugarGpl: 2, structure: 2 },
  'Smoked Porter': { body: 4, residualSugarGpl: 5, structure: 2 },
};

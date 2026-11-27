import { test, expect } from 'vitest';
import { drinkDatabase } from '../../src/lib/drinks/data';
import { CALIBRATION, X_COEFFICIENTS, Y_COEFFICIENTS, placeStyle, rawPlacement, type StyleProfile } from '../../src/lib/drinks/placement';

/** Ordinary least squares by the normal equations; small enough to solve directly. */
function fit(rows: number[][], target: number[]): number[] {
  const n = rows[0].length;
  const a = Array.from({ length: n }, (_, j) => Array.from({ length: n }, (_, k) => rows.reduce((s, r) => s + r[j] * r[k], 0)));
  const b = Array.from({ length: n }, (_, j) => rows.reduce((s, r, i) => s + r[j] * target[i], 0));
  for (let i = 0; i < n; i++) {
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = a[r][i] / a[i][i];
      for (let k = i; k < n; k++) a[r][k] -= f * a[i][k];
      b[r] -= f * b[i];
    }
  }
  return b.map((v, i) => v / a[i][i]);
}

const calibration = Object.entries(CALIBRATION).map(([name, profile]) => {
  const drink = drinkDatabase.find((d) => d.name === name);
  return { name, profile, drink };
});

test('Placement: every calibration drink is a hand-placed drink on the map', () => {
  for (const c of calibration) {
    expect(c.drink, c.name).toBeDefined();
    expect(c.drink!.profile, `${c.name} is calibration, so it is placed by hand`).toBeUndefined();
  }
});

test('Placement: the coefficients are the least-squares fit to the hand placements', () => {
  const xs = fit(calibration.map((c) => [1, c.profile.body]), calibration.map((c) => c.drink!.x));
  const ys = fit(
    calibration.map((c) => [1, Math.log2(1 + c.profile.residualSugarGpl), c.profile.structure]),
    calibration.map((c) => c.drink!.y)
  );
  xs.forEach((v, i) => expect(X_COEFFICIENTS[i]).toBeCloseTo(v, 1));
  ys.forEach((v, i) => expect(Y_COEFFICIENTS[i]).toBeCloseTo(v, 1));
});

test('Placement: it lands within three points of the hand placements, on average', () => {
  const sq = calibration.map((c) => {
    const p = rawPlacement(c.profile);
    return (p.x - c.drink!.x) ** 2 + (p.y - c.drink!.y) ** 2;
  });
  expect(Math.sqrt(sq.reduce((a, b) => a + b, 0) / sq.length)).toBeLessThan(3);
});

test('Placement: a drink with a profile sits exactly where its profile puts it', () => {
  const placed = drinkDatabase.filter((d) => d.profile);
  expect(placed.length).toBeGreaterThan(0);
  for (const d of placed) expect({ x: d.x, y: d.y }, d.name).toEqual(placeStyle(d.profile as StyleProfile));
});

test('Placement: body moves a drink toward rich, sugar toward sweet, structure toward savory', () => {
  const base: StyleProfile = { body: 2, residualSugarGpl: 4, structure: 1 };
  expect(rawPlacement({ ...base, body: 4 }).x).toBeLessThan(rawPlacement(base).x);
  expect(rawPlacement({ ...base, residualSugarGpl: 40 }).y).toBeGreaterThan(rawPlacement(base).y);
  expect(rawPlacement({ ...base, structure: 3 }).y).toBeLessThan(rawPlacement(base).y);
});

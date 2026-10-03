import { test, expect } from '@playwright/test';
import {
  createInitialPalateState,
  updatePalateEKF,
  applyPour,
  MAX_POUR_STEP,
  normalizeObservation,
  projectTo2D,
  getPalateConfidence,
  getDiagonal,
} from '../src/lib/palate-state';
import type { Drink } from '../src/lib/data';

const testDrink: Drink = {
  name: 'Test Daiquiri',
  type: 'Cocktail',
  x: 7,
  y: 5,
  hasSmoke: false,
  hasAnise: false,
  isBitter: false,
  tags: ['classic', 'crushable'],
};

test('PalateState: initializes correctly with expected priors', async () => {
  const state = createInitialPalateState({ x: 4, y: -2, dislikesBitter: true });
  expect(state.vector.crisp).toBe(4);
  expect(state.vector.sweet).toBe(-2);
  expect(state.vector.bitter).toBe(2.0); // dislikesBitter penalizes prior
  expect(state.eventCount).toBe(0);

  const diag = getDiagonal(state.covariance);
  expect(diag).toEqual([25, 25, 16, 16, 16]);
  expect(getPalateConfidence(state)).toBe(0);
});

test('PalateState: biological normalization adjusts for SSS volume and fasting', async () => {
  // SSS: High volume (>150ml) sweet drink pleasantness degrades naturally
  const lowVol = normalizeObservation(
    { hedonic: 8, context: { volumeConsumedMl: 100, fastingDurationHours: 2 } },
    testDrink
  );
  const highVol = normalizeObservation(
    { hedonic: 8, context: { volumeConsumedMl: 400, fastingDurationHours: 2 } },
    testDrink
  );
  // High volume should have higher normalized rating to recover true preference
  expect(highVol.normalizedHedonic).toBeGreaterThan(lowVol.normalizedHedonic);

  // Fasting (>3.5 hrs) elevates sweet reward; normalization attenuates it
  const fastingNorm = normalizeObservation(
    { hedonic: 8, context: { volumeConsumedMl: 150, fastingDurationHours: 5 } },
    testDrink
  );
  const baselineNorm = normalizeObservation(
    { hedonic: 8, context: { volumeConsumedMl: 150, fastingDurationHours: 2 } },
    testDrink
  );
  expect(fastingNorm.normalizedHedonic).toBeLessThan(baselineNorm.normalizedHedonic);
});

test('PalateState: EKF updates state and covariance contracts over sequential tastings', async () => {
  let state = createInitialPalateState({ x: 0, y: 0 });
  const initialDiag = getDiagonal(state.covariance);
  const initialTrace = initialDiag.reduce((a, b) => a + b, 0);

  // User consistently rates sweet, crisp drinks highly
  for (let i = 0; i < 5; i++) {
    const res = updatePalateEKF(state, testDrink, {
      hedonic: 9,
      cata: ['lime', 'citrus'],
      context: { volumeConsumedMl: 150, fastingDurationHours: 2 },
    });
    state = res.nextState;
  }

  expect(state.eventCount).toBe(5);

  // Coordinate should move toward the liked drink (x: 7, y: 5)
  expect(state.vector.crisp).toBeGreaterThan(0);
  expect(state.vector.sweet).toBeGreaterThan(0);

  // Covariance trace should have shrunken significantly (confidence increased)
  const finalDiag = getDiagonal(state.covariance);
  const finalTrace = finalDiag.reduce((a, b) => a + b, 0);
  expect(finalTrace).toBeLessThan(initialTrace);
  expect(getPalateConfidence(state)).toBeGreaterThan(0);

  // 2D projection works cleanly
  const coords = projectTo2D(state);
  expect(coords.x).toBe(Math.round(state.vector.crisp * 10) / 10);
  expect(coords.y).toBe(Math.round(state.vector.sweet * 10) / 10);
});

test('PalateState: a pour of a drink not on the map leaves the coordinate where it was', async () => {
  const prior = createInitialPalateState({ x: -4, y: 3 });
  for (const hedonic of [1, 5, 9]) {
    const next = applyPour(prior, undefined, { hedonic });
    expect(projectTo2D(next)).toEqual({ x: -4, y: 3 });
  }
  // A drink the map knows still moves it.
  const moved = applyPour(prior, testDrink, { hedonic: 9 });
  expect(projectTo2D(moved)).not.toEqual({ x: -4, y: 3 });
});

const distanceTo = (p: { x: number; y: number }, d: Drink) => Math.hypot(d.x - p.x, d.y - p.y);

test('PalateState: liking a drink close to you pulls you toward it', async () => {
  const nearby: Drink = { ...testDrink, x: -4, y: 4 };
  const prior = createInitialPalateState({ x: -4, y: 3 });
  for (const hedonic of [7, 9]) {
    const next = projectTo2D(applyPour(prior, nearby, { hedonic }));
    expect(distanceTo(next, nearby)).toBeLessThan(1);
  }
});

test('PalateState: disliking a drink steps away, and the middle of the scale stays put', async () => {
  const prior = createInitialPalateState({ x: 0, y: 0 });
  const away = projectTo2D(applyPour(prior, testDrink, { hedonic: 1 }));
  expect(distanceTo(away, testDrink)).toBeGreaterThan(distanceTo({ x: 0, y: 0 }, testDrink));
  expect(projectTo2D(applyPour(prior, testDrink, { hedonic: 5 }))).toEqual({ x: 0, y: 0 });
});

test('PalateState: one pour never moves the dot further than the cap', async () => {
  const far: Drink = { ...testDrink, x: 10, y: -10 };
  const prior = createInitialPalateState({ x: -10, y: 10 });
  for (const hedonic of [1, 9]) {
    const next = projectTo2D(applyPour(prior, far, { hedonic }, ['too-sweet', 'too-rich']));
    expect(Math.hypot(next.x + 10, next.y - 10)).toBeLessThanOrEqual(MAX_POUR_STEP + 0.05);
  }
});

test('PalateState: "what was off" nudges the dot, even for a drink not on the map', async () => {
  const prior = createInitialPalateState({ x: 0, y: 0 });
  expect(projectTo2D(applyPour(prior, undefined, { hedonic: 5 }, ['too-sweet']))).toEqual({ x: 0, y: -1.2 });
  expect(projectTo2D(applyPour(prior, undefined, { hedonic: 5 }, ['too-crisp']))).toEqual({ x: -1.2, y: 0 });
});

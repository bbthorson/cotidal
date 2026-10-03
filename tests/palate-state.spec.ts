import { test, expect } from '@playwright/test';
import {
  createInitialPalateState,
  updatePalateEKF,
  applyPour,
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

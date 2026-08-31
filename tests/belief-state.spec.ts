import { test, expect } from '@playwright/test';
import {
  createInitialBelief,
  updateBelief,
  beliefToProfile,
  isComplete,
  getConfidenceProgress,
} from '../src/lib/belief-state';
import { questions } from '../src/lib/discovery-questions';

/**
 * Coordinate and vibe-tag accumulation used to be checked by walking the UI,
 * which coupled the assertion to an adaptive question order that can change.
 * The accumulation itself is pure, so it is tested directly here.
 */

const option = (questionId: string, index: number) => {
  const question = questions.find((q) => q.id === questionId);
  if (!question) throw new Error(`No question ${questionId}`);
  return question.options[index];
};

test('Belief: answers move the coordinate along both axes', async () => {
  let belief = createInitialBelief();
  const start = beliefToProfile(belief);

  // "Black or Espresso." carries dx: -5, dy: -2 — rich and savory.
  belief = updateBelief(belief, option('coffee', 0));
  const afterCoffee = beliefToProfile(belief);
  expect(afterCoffee.x).toBeLessThan(start.x);
  expect(afterCoffee.y).toBeLessThan(start.y);

  // "Lemon Tart (Zest)" carries dx: 5, dy: 5 — pulls back crisp and sweet.
  belief = updateBelief(belief, option('dessert', 0));
  const afterDessert = beliefToProfile(belief);
  expect(afterDessert.x).toBeGreaterThan(afterCoffee.x);
  expect(afterDessert.y).toBeGreaterThan(afterCoffee.y);
});

test('Belief: filter flags become explicit aversions', async () => {
  let belief = createInitialBelief();
  belief = updateBelief(belief, option('bitter_tol', 1)); // "Too bitter for me."
  belief = updateBelief(belief, option('smoke', 1));      // "No thanks."

  const profile = beliefToProfile(belief);
  expect(profile.dislikesBitter).toBe(true);
  expect(profile.dislikesSmoke).toBe(true);
});

test('Belief: vibe tags accumulate from tagged options', async () => {
  let belief = createInitialBelief();
  belief = updateBelief(belief, option('texture', 0));  // crushable
  belief = updateBelief(belief, option('pacing', 1));   // social, crushable

  const { vibeTags } = beliefToProfile(belief);
  expect(vibeTags.crushable).toBeGreaterThan(0);
  expect(vibeTags.social).toBeGreaterThan(0);
});

test('Belief: confidence rises with answers and starts incomplete', async () => {
  let belief = createInitialBelief();
  expect(isComplete(belief)).toBe(false);
  const before = getConfidenceProgress(belief);

  belief = updateBelief(belief, option('coffee', 0));
  belief = updateBelief(belief, option('dessert', 0));

  expect(getConfidenceProgress(belief)).toBeGreaterThan(before);
});

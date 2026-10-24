import { test, expect } from '@playwright/test';
import {
  createInitialBelief,
  updateBelief,
  answerQuestion,
  beliefToProfile,
  isComplete,
  getConfidenceProgress,
} from '../src/lib/belief-state';
import { questions, type Question, type QuestionOption } from '../src/lib/discovery-questions';
import { drinkDatabase } from '../src/lib/data';

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

test('Belief: Sommelier Triads apply repulsive vectors and resolve filters', async () => {
  let belief = createInitialBelief();

  // Triad 1: Pushing away "Dense Velvet & Demerara" (Option 1) -> moves away from sweet/rich (dx: 4, dy: -4)
  belief = updateBelief(belief, option('triad_sugar_texture', 1));
  let profile = beliefToProfile(belief);
  expect(profile.x).toBeGreaterThan(0); // Pushed crisp
  expect(profile.y).toBeLessThan(0);    // Pushed savory

  // Triad 2: Pushing away "Alpine Roots & Dark Amaro" (Option 0) -> dislikesBitter: true
  belief = updateBelief(belief, option('triad_bitter_botanical', 0));
  profile = beliefToProfile(belief);
  expect(profile.dislikesBitter).toBe(true);

  // Triad 3: Pushing away "Charred Agave & Islay Peat" (Option 0) -> dislikesSmoke: true
  belief = updateBelief(belief, option('triad_smoke_oak', 0));
  profile = beliefToProfile(belief);
  expect(profile.dislikesSmoke).toBe(true);
});

const nudge = (dx: number, dy = 0): QuestionOption => ({ text: `${dx},${dy}`, dx, dy });
const answer = (opts: QuestionOption[]) => opts.reduce(updateBelief, createInitialBelief());

test('Belief: agreeing answers build confidence, contradicting ones do not', async () => {
  const agree = answer([nudge(4), nudge(4)]);
  const contradict = answer([nudge(4), nudge(-4)]);

  expect(agree.axes.x.variance).toBeLessThan(contradict.axes.x.variance);
  // Two opposite answers say nothing reliable about where the user sits.
  expect(contradict.axes.x.variance).toBeGreaterThanOrEqual(createInitialBelief().axes.x.variance);
  expect(contradict.axes.x.mean).toBeCloseTo(0);
});

test('Belief: each further agreeing answer moves the dot less', async () => {
  const steps: number[] = [];
  let belief = createInitialBelief();
  for (let i = 0; i < 4; i++) {
    const before = belief.axes.x.mean;
    belief = updateBelief(belief, nudge(3));
    steps.push(belief.axes.x.mean - before);
  }
  for (let i = 1; i < steps.length; i++) expect(steps[i]).toBeLessThan(steps[i - 1]);
  // A consistent run approaches its answers rather than pinning at the edge.
  expect(belief.axes.x.mean).toBeLessThan(10);
});

test('Belief: the same answers in any order give the same belief', async () => {
  const opts = [nudge(4, -2), nudge(-1, 3), nudge(2, 0), nudge(-3, 5)];
  const forward = answer(opts);
  const reversed = answer([...opts].reverse());
  for (const axis of ['x', 'y'] as const) {
    expect(reversed.axes[axis].mean).toBeCloseTo(forward.axes[axis].mean, 10);
    expect(reversed.axes[axis].variance).toBeCloseTo(forward.axes[axis].variance, 10);
  }
});

test('Belief: a nudge of zero leaves that axis untouched', async () => {
  const belief = answer([nudge(0, 3)]);
  expect(belief.axes.x).toEqual(createInitialBelief().axes.x);
  expect(belief.axes.y.evidence).toHaveLength(1);
});

test('Belief: one answer does not claim to know more than it does', async () => {
  // A single answer cannot disagree with anything, so its variance leans on
  // how much answers typically scatter rather than reading as near-certain.
  const one = answer([nudge(4)]);
  expect(one.axes.x.variance).toBeGreaterThan(15);
  expect(beliefToProfile(one).variance).toEqual({ x: one.axes.x.variance, y: one.axes.y.variance });
});

/**
 * Forced-choice pairs. Two options a few points apart on one axis; the answer
 * says which side of their midpoint the user is on, not that they sit at the
 * chosen option.
 */
const pairOf = (a: number, b: number): Question => ({
  id: `pair_${a}_${b}`,
  tier: 'context',
  category: 'palate',
  sectionNumber: '01',
  text: 'Which one?',
  type: 'pair',
  primaryAxis: 'x',
  options: [nudge(a), nudge(b)],
});

test('Pairs: choosing a side moves the estimate toward that side', async () => {
  const pair = pairOf(-2, 2);
  const start = createInitialBelief();
  const left = answerQuestion(start, pair, pair.options[0]);
  const right = answerQuestion(start, pair, pair.options[1]);

  expect(left.axes.x.mean).toBeLessThan(0);
  expect(right.axes.x.mean).toBeCloseTo(-left.axes.x.mean, 6);
  expect(left.axes.x.variance).toBeLessThan(start.axes.x.variance);
  // A one-axis pair says nothing about the other axis.
  expect(left.axes.y).toEqual(start.axes.y);
  expect(left.axes.x.evidence).toHaveLength(0);
  expect(left.axes.x.comparisons).toHaveLength(1);
});

test('Pairs: an answer is a side of a line, not a position', async () => {
  // Confidently crisp, then asked a pair well to the rich side of them. Taking
  // the crisper of the two agrees with what we know: as a position it would
  // drag the dot to −2.5; as a comparison it barely moves it.
  const sure = answer([nudge(3), nudge(3), nudge(3), nudge(3)]);
  const pair = pairOf(-4, -1);
  const after = answerQuestion(sure, pair, pair.options[1]);
  const asPosition = updateBelief(sure, pair.options[1]);

  expect(Math.abs(after.axes.x.mean - sure.axes.x.mean)).toBeLessThan(0.5);
  expect(asPosition.axes.x.mean).toBeLessThan(after.axes.x.mean - 1);
});

test('Pairs: order does not matter when pairs and positions mix', async () => {
  const a = pairOf(-2, 2);
  const b = pairOf(1, 4);
  const steps: [Question | null, QuestionOption][] = [
    [null, nudge(3, -1)],
    [a, a.options[1]],
    [null, nudge(-1, 2)],
    [b, b.options[0]],
  ];
  const run = (order: typeof steps) =>
    order.reduce(
      (belief, [q, o]) => (q ? answerQuestion(belief, q, o) : updateBelief(belief, o)),
      createInitialBelief()
    );
  const forward = run(steps);
  const reversed = run([...steps].reverse());
  for (const axis of ['x', 'y'] as const) {
    expect(reversed.axes[axis].mean).toBeCloseTo(forward.axes[axis].mean, 10);
    expect(reversed.axes[axis].variance).toBeCloseTo(forward.axes[axis].variance, 10);
  }
});

test('Pairs: every authored pair is two sensations on one axis, never a drink name', async () => {
  const pairs = questions.filter((q) => q.type === 'pair');
  expect(pairs.length).toBeGreaterThan(0);
  const names = new Set(drinkDatabase.map((d) => d.name.toLowerCase()));
  for (const q of pairs) {
    expect(q.options, q.id).toHaveLength(2);
    const [a, b] = q.options;
    const off = q.primaryAxis === 'x' ? 'dy' : 'dx';
    const on = q.primaryAxis === 'x' ? 'dx' : 'dy';
    expect(a[off], q.id).toBe(0);
    expect(b[off], q.id).toBe(0);
    expect(a[on], q.id).not.toBe(b[on]);
    for (const o of q.options) expect(names.has(o.text.toLowerCase()), o.text).toBe(false);
  }
});

import { test, expect } from '@playwright/test';
import {
  createInitialBelief,
  answerQuestion,
  INITIAL_VARIANCE,
  TICKS,
  choiceProbs,
  choiceTable,
  optionLocations,
  probsAt,
  beliefToProfile,
  isComplete,
  getConfidenceProgress,
} from '../src/lib/belief-state';
import { questions, type Question } from '../src/lib/discovery-questions';
import { drinkDatabase } from '../src/lib/data';

/**
 * Coordinate and vibe-tag accumulation used to be checked by walking the UI,
 * which coupled the assertion to an adaptive question order that can change.
 * The accumulation itself is pure, so it is tested directly here.
 */

const bank = (questionId: string) => {
  const question = questions.find((q) => q.id === questionId);
  if (!question) throw new Error(`No question ${questionId}`);
  return question;
};

/** Answer a question from the bank by option index. */
const pick = (belief: ReturnType<typeof createInitialBelief>, questionId: string, index: number) =>
  answerQuestion(belief, bank(questionId), bank(questionId).options[index]);

test('Belief: answers move the coordinate along both axes', async () => {
  let belief = createInitialBelief();
  const start = beliefToProfile(belief);

  // "Black or Espresso." carries dx: -5, dy: -2 — rich and savory.
  belief = pick(belief, 'coffee', 0);
  const afterCoffee = beliefToProfile(belief);
  expect(afterCoffee.x).toBeLessThan(start.x);
  expect(afterCoffee.y).toBeLessThan(start.y);

  // "Lemon Tart (Zest)" carries dx: 5, dy: 5 — pulls back crisp and sweet.
  belief = pick(belief, 'dessert', 0);
  const afterDessert = beliefToProfile(belief);
  expect(afterDessert.x).toBeGreaterThan(afterCoffee.x);
  expect(afterDessert.y).toBeGreaterThan(afterCoffee.y);
});

test('Belief: filter flags become explicit aversions', async () => {
  let belief = createInitialBelief();
  belief = pick(belief, 'bitter_tol', 1); // "Too bitter for me."
  belief = pick(belief, 'smoke', 1);      // "No thanks."

  const profile = beliefToProfile(belief);
  expect(profile.dislikesBitter).toBe(true);
  expect(profile.dislikesSmoke).toBe(true);
});

test('Belief: vibe tags accumulate from tagged options', async () => {
  let belief = createInitialBelief();
  belief = pick(belief, 'texture', 0);  // crushable
  belief = pick(belief, 'pacing', 1);   // social, crushable

  const { vibeTags } = beliefToProfile(belief);
  expect(vibeTags.crushable).toBeGreaterThan(0);
  expect(vibeTags.social).toBeGreaterThan(0);
});

test('Belief: confidence rises with answers and starts incomplete', async () => {
  let belief = createInitialBelief();
  expect(isComplete(belief)).toBe(false);
  const before = getConfidenceProgress(belief);

  belief = pick(belief, 'coffee', 0);
  belief = pick(belief, 'dessert', 0);

  expect(getConfidenceProgress(belief)).toBeGreaterThan(before);
});

test('Belief: Sommelier Triads apply repulsive vectors and resolve filters', async () => {
  let belief = createInitialBelief();

  // Triad 1: Pushing away "Dense Velvet & Demerara" (Option 1) -> moves away from sweet/rich (dx: 4, dy: -4)
  belief = pick(belief, 'triad_sugar_texture', 1);
  let profile = beliefToProfile(belief);
  expect(profile.x).toBeGreaterThan(0); // Pushed crisp
  expect(profile.y).toBeLessThan(0);    // Pushed savory

  // Triad 2: Pushing away "Alpine Roots & Dark Amaro" (Option 0) -> dislikesBitter: true
  belief = pick(belief, 'triad_bitter_botanical', 0);
  profile = beliefToProfile(belief);
  expect(profile.dislikesBitter).toBe(true);

  // Triad 3: Pushing away "Charred Agave & Islay Peat" (Option 0) -> dislikesSmoke: true
  belief = pick(belief, 'triad_smoke_oak', 0);
  profile = beliefToProfile(belief);
  expect(profile.dislikesSmoke).toBe(true);
});

/** A synthetic question; options are [dx, dy] nudges. */
const ask = (id: string, ...nudges: [number, number][]): Question => ({
  id,
  tier: 'context',
  category: 'palate',
  sectionNumber: '01',
  text: id,
  primaryAxis: 'x',
  options: nudges.map(([dx, dy]) => ({ text: `${id}:${dx},${dy}`, dx, dy })),
});
const pairOf = (a: number, b: number): Question => ({ ...ask(`pair_${a}_${b}`, [a, 0], [b, 0]), type: 'pair' });

type Step = [Question, number];
const run = (steps: Step[]) =>
  steps.reduce((belief, [q, i]) => answerQuestion(belief, q, q.options[i]), createInitialBelief());

const crispOrRich = ask('crisp_or_rich', [-4, 0], [4, 0]);

test('Belief: the prior is centred and its variance is what progress counts from', async () => {
  const start = createInitialBelief();
  expect(start.axes.x.mean).toBeCloseTo(0, 10);
  expect(start.axes.y.mean).toBeCloseTo(0, 10);
  expect(start.axes.x.variance).toBeCloseTo(INITIAL_VARIANCE, 10);
  expect(getConfidenceProgress(start)).toBeCloseTo(0, 10);
  expect(start.posterior.reduce((a, w) => a + w, 0)).toBeCloseTo(1, 10);
});

test('Belief: answers that disagree leave the axis less certain than answers that agree', async () => {
  // Both pairs of answers centre the estimate. Twice choosing the middle is
  // consistent; once each way is not, and the posterior reads that as a
  // noisier answerer rather than as confident evidence for the middle.
  const three = ask('three', [-4, 0], [0, 0], [4, 0]);
  const agree = run([[three, 1], [three, 1]]);
  const disagree = run([[three, 0], [three, 2]]);

  expect(agree.axes.x.mean).toBeCloseTo(0, 6);
  expect(disagree.axes.x.mean).toBeCloseTo(0, 6);
  expect(disagree.axes.x.variance).toBeGreaterThan(agree.axes.x.variance);
  expect(disagree.axes.x.variance).toBeLessThan(INITIAL_VARIANCE);
});

test('Belief: each further agreeing answer moves the dot less', async () => {
  const steps: number[] = [];
  let belief = createInitialBelief();
  for (let i = 0; i < 4; i++) {
    const before = belief.axes.x.mean;
    belief = answerQuestion(belief, crispOrRich, crispOrRich.options[1]);
    steps.push(belief.axes.x.mean - before);
  }
  for (let i = 1; i < steps.length; i++) expect(steps[i]).toBeLessThan(steps[i - 1]);
  expect(belief.axes.x.mean).toBeLessThan(10);
});

test('Belief: the same answers in any order give the same belief', async () => {
  const steps: Step[] = [
    [ask('a', [4, -2], [-1, 3]), 0],
    [ask('b', [-1, 3], [2, 0], [-3, 5]), 2],
    [pairOf(-2, 2), 1],
    [ask('c', [2, 0], [-3, 5]), 0],
    [pairOf(1, 4), 0],
  ];
  const forward = run(steps);
  const reversed = run([...steps].reverse());
  for (const axis of ['x', 'y'] as const) {
    expect(reversed.axes[axis].mean).toBeCloseTo(forward.axes[axis].mean, 10);
    expect(reversed.axes[axis].variance).toBeCloseTo(forward.axes[axis].variance, 10);
  }
});

test('Belief: a question about one axis leaves the other untouched', async () => {
  const start = createInitialBelief();
  const belief = run([[ask('sweetness', [0, 3], [0, -3]), 0]]);
  expect(belief.axes.x.mean).toBeCloseTo(start.axes.x.mean, 10);
  expect(belief.axes.x.variance).toBeCloseTo(start.axes.x.variance, 10);
  expect(belief.axes.y.mean).toBeGreaterThan(0);

  // An answer with no position at all (an aversion only) leaves both.
  const flagOnly = run([[ask('flag', [0, 0], [0, 0]), 0]]);
  expect(flagOnly.axes).toEqual(start.axes);
  expect(flagOnly.questionCount).toBe(1);
});

test('Belief: one answer does not claim to know more than it does', async () => {
  // One answer says which half of the map, no more: nowhere near certain
  // enough to call the axis done.
  const one = run([[crispOrRich, 1]]);
  expect(one.axes.x.variance).toBeGreaterThan(6);
  expect(beliefToProfile(one).variance).toEqual({ x: one.axes.x.variance, y: one.axes.y.variance });
});

test('Belief: an equal copy of an option counts as that option', async () => {
  // The chat flow can hand back a copy rather than the object in the bank.
  const copy = { ...crispOrRich.options[1] };
  const byCopy = answerQuestion(createInitialBelief(), crispOrRich, copy);
  const byRef = answerQuestion(createInitialBelief(), crispOrRich, crispOrRich.options[1]);
  expect(byCopy.axes).toEqual(byRef.axes);
});

/**
 * Forced-choice pairs. Two options a few points apart on one axis; the answer
 * says which side of their midpoint the user is on.
 */
test('Pairs: choosing a side moves the estimate toward that side', async () => {
  const pair = pairOf(-2, 2);
  const start = createInitialBelief();
  const left = run([[pair, 0]]);
  const right = run([[pair, 1]]);

  expect(left.axes.x.mean).toBeLessThan(0);
  expect(right.axes.x.mean).toBeCloseTo(-left.axes.x.mean, 6);
  expect(left.axes.x.variance).toBeLessThan(start.axes.x.variance);
  expect(left.axes.y.variance).toBeCloseTo(start.axes.y.variance, 10);
});

test('Pairs: an answer is a side of a line, not a position', async () => {
  // Confidently crisp, then asked a pair well to the rich side of them.
  // Taking the crisper of the two agrees with what we know, so it barely
  // moves the dot — it does not drag it to where that option sits (−2.5).
  const sure = run([[crispOrRich, 1], [crispOrRich, 1], [crispOrRich, 1], [crispOrRich, 1]]);
  const pair = pairOf(-4, -1);
  const after = answerQuestion(sure, pair, pair.options[1]);
  expect(Math.abs(after.axes.x.mean - sure.axes.x.mean)).toBeLessThan(0.5);
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

test('Belief: the grid tables compute the same response model as choiceProbs', async () => {
  // Selection and scoring use precomputed per-axis tables for speed; they must
  // agree with the readable definition at every point.
  const options = optionLocations(bank('triad_sugar_texture'));
  const table = choiceTable(options, 24);
  const out = new Float64Array(options.length);
  for (const ix of [0, 7, 20, 33, TICKS.length - 1]) {
    for (const iy of [0, 11, 20, 29, TICKS.length - 1]) {
      const fast = Array.from(probsAt(table, ix, iy, out));
      const exact = choiceProbs(options, 24, TICKS[ix], TICKS[iy]);
      fast.forEach((p, k) => expect(p).toBeCloseTo(exact[k], 12));
    }
  }
});

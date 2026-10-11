import { questions, type Question, type QuestionCategory, type QuestionOption } from './discovery-questions';
import {
  EVIDENCE_SCALE,
  ANSWER_NOISE,
  type BeliefState,
  type FilterState,
} from './belief-state';

// The 4 Sommelier Triads: Negative Elimination cold start
const CALIBRATION_IDS = [
  'triad_sugar_texture',
  'triad_bitter_botanical',
  'triad_smoke_oak',
  'triad_proof_tempo',
];

// What resolving one open aversion is worth, in nats. isComplete waits on
// every aversion as well as on both axes, so a question that can settle one
// competes with one that only sharpens the position. Tuned by simulation.
export const AVERSION_WEIGHT = 0.25;

type Axis = 'x' | 'y';
const AXES: Axis[] = ['x', 'y'];

function evidenceFor(nudge: number): number {
  return Math.max(-10, Math.min(10, nudge * EVIDENCE_SCALE));
}

function nudgeOn(option: QuestionOption, axis: Axis): number {
  return axis === 'x' ? option.dx : option.dy;
}

function resolvedAversions(belief: BeliefState, option: QuestionOption): number {
  const set = { ...option.filterFlags };
  if (option.filterFlag) set[option.filterFlag.key] = option.filterFlag.value;
  return (Object.keys(set) as (keyof FilterState)[]).filter(
    (k) => set[k] !== undefined && belief.filters[k] === null
  ).length;
}

// Where the user might plausibly be on one axis, as offsets in standard
// deviations with their weights (three-point Gauss-Hermite).
const NODES: [number, number][] = [
  [-Math.sqrt(3), 1 / 6],
  [0, 2 / 3],
  [Math.sqrt(3), 1 / 6],
];

function entropy(p: number[]): number {
  return p.reduce((h, x) => (x > 0 ? h - x * Math.log(x) : h), 0);
}

/**
 * How much a question is expected to tell us, in nats, plus AVERSION_WEIGHT
 * for each open aversion its likely answer would resolve.
 *
 * The information part is the mutual information between the answer and the
 * user's position: how unpredictable the answer is overall, less how
 * unpredictable it would be if we knew where they sat. A user at a given
 * point picks each option with probability falling off with the distance to
 * where that option places them, at the noise of one answer.
 *
 * Scoring by expected drop in reported variance instead rewards questions
 * whose likely answer agrees with the current belief, which sharpens the
 * reported confidence without sharpening the estimate.
 */
export function expectedGain(belief: BeliefState, question: Question): number {
  const used = AXES.filter((a) => question.options.some((o) => nudgeOn(o, a) !== 0));
  const points: { at: Record<Axis, number>; weight: number }[] = [];
  const grid = (i: number, at: Record<Axis, number>, weight: number) => {
    if (i === used.length) return void points.push({ at: { ...at }, weight });
    const axis = used[i];
    const { mean, variance } = belief.axes[axis];
    for (const [offset, w] of NODES) {
      grid(i + 1, { ...at, [axis]: mean + offset * Math.sqrt(variance) }, weight * w);
    }
  };
  grid(0, { x: belief.axes.x.mean, y: belief.axes.y.mean }, 1);

  const choice = (at: Record<Axis, number>) => {
    const logs = question.options.map((o) =>
      used.reduce((sum, a) => sum - (evidenceFor(nudgeOn(o, a)) - at[a]) ** 2 / (2 * ANSWER_NOISE), 0)
    );
    const peak = Math.max(...logs);
    const w = logs.map((l) => Math.exp(l - peak));
    const total = w.reduce((a, x) => a + x, 0);
    return w.map((x) => x / total);
  };

  const marginal = question.options.map(() => 0);
  let conditional = 0;
  for (const { at, weight } of points) {
    const p = choice(at);
    p.forEach((x, i) => (marginal[i] += weight * x));
    conditional += weight * entropy(p);
  }
  const information = entropy(marginal) - conditional;

  const aversions = question.options.reduce(
    (sum, o, i) => sum + marginal[i] * resolvedAversions(belief, o),
    0
  );
  return information + AVERSION_WEIGHT * aversions;
}

function bestQuestion(belief: BeliefState, pool: Question[]): Question | null {
  let best: Question | null = null;
  let bestGain = -Infinity;
  // Ties keep bank order, so selection is deterministic.
  for (const q of pool) {
    const gain = expectedGain(belief, q);
    if (gain > bestGain) {
      best = q;
      bestGain = gain;
    }
  }
  return best;
}

export function selectNextQuestion(
  belief: BeliefState,
  answeredIds: Set<string>,
): Question | null {
  // Cold start: serve calibration questions in order
  if (belief.questionCount < CALIBRATION_IDS.length) {
    const id = CALIBRATION_IDS[belief.questionCount];
    const q = questions.find(q => q.id === id);
    if (q && !answeredIds.has(q.id)) return q;
  }

  // After calibration: the question expected to settle the most
  return bestQuestion(belief, questions.filter(q => !answeredIds.has(q.id)));
}

// Fallback: pick from non-calibration hardcoded pool (skips calibration IDs)
export function selectFallbackQuestion(
  belief: BeliefState,
  answeredIds: Set<string>,
): Question | null {
  return bestQuestion(
    belief,
    questions.filter(q => !answeredIds.has(q.id) && !CALIBRATION_IDS.includes(q.id)),
  );
}

export function getTierLabel(question: Question): string {
  switch (question.tier) {
    case 'calibration': return 'The Basics';
    case 'architecture': return 'Your Style';
    case 'context': return 'The Details';
  }
}

export function getCategoryLabel(category: QuestionCategory): string {
  switch (category) {
    case 'palate': return 'The Palate';
    case 'architecture': return 'The Method';
    case 'ritual': return 'The Ritual';
    case 'occasion': return 'The Hour';
  }
}

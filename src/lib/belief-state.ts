import type { Question, QuestionOption } from './discovery-questions';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';

/**
 * A forced-choice answer: of two options on one axis, the user took the one
 * whose evidence sits at `chose` over the one at `over`. It says which side of
 * their midpoint the user is on, not that the user is at `chose`.
 */
export interface Comparison {
  chose: number;
  over: number;
}

export interface AxisBelief {
  mean: number;       // current estimate, bounded [-10, 10]
  variance: number;   // uncertainty — starts at 25, falls as answers agree
  evidence: number[]; // where each answer placed the user on this axis
  comparisons: Comparison[]; // forced-choice pairs answered on this axis
}

export interface FilterState {
  dislikesSmoke: boolean | null;
  dislikesBitter: boolean | null;
  dislikesAnise: boolean | null;
}

export interface BeliefState {
  axes: Record<string, AxisBelief>;
  filters: FilterState;
  vibeTags: Record<string, number>;
  questionCount: number;
}

const INITIAL_VARIANCE = 25;

// How far one answer places the user per unit of its authored nudge. The
// strongest nudges in the bank (|d| = 4-5) place the user at the edge of the map.
export const EVIDENCE_SCALE = 2.5;

// Variance of a single answer as evidence of position.
export const ANSWER_NOISE = 12;

// The same noise for a forced-choice pair, in the selector's response model:
// P(chose | t) = softmax of −(z − t)² / 2·PAIR_NOISE over the two options.
// Comparative judgements are often argued to be less noisy than absolute
// ones, but nothing here has measured that, so it starts equal. Pours are the
// data that could calibrate it.
export const PAIR_NOISE = ANSWER_NOISE;

// How far answers typically disagree with the estimate (squared, in map
// units), and how many answers' worth of weight that assumption carries
// before the user's own answers take over. Tuned by simulation so reported
// variance tracks actual squared error from the first answer.
const TYPICAL_SCATTER = 40;
const TYPICAL_SCATTER_WEIGHT = 2;

// Stop once an axis is as certain as about six agreeing answers make it. With
// the current bank, actual squared error levels off near 5 by then; asking
// more buys little. Tuned by simulation against the real question bank.
const COMPLETION_THRESHOLD = 6;
const MIN_QUESTIONS = 4;
export const MAX_QUESTIONS = 8;

export function createInitialBelief(): BeliefState {
  return {
    axes: {
      x: { mean: 0, variance: INITIAL_VARIANCE, evidence: [], comparisons: [] },
      y: { mean: 0, variance: INITIAL_VARIANCE, evidence: [], comparisons: [] },
    },
    filters: {
      dislikesSmoke: null,
      dislikesBitter: null,
      dislikesAnise: null,
    },
    vibeTags: {},
    questionCount: 0,
  };
}

/**
 * Recomputes one axis from all of its evidence at once.
 *
 * The mean is the Gaussian posterior: a prior of 0 at INITIAL_VARIANCE and one
 * observation per answer at ANSWER_NOISE, so the eighth answer moves the dot
 * no more than the first. The posterior variance is then inflated by how far
 * the answers disagree with it, so answers that contradict each other leave
 * the axis uncertain rather than confidently centred. Working from the whole
 * set rather than step by step makes the result independent of answer order.
 *
 * Forced-choice pairs are not positions, so they cannot join that average.
 * Each is a logistic boundary at the pair's midpoint — the likelihood the
 * selector's response model already implies for two options — multiplied
 * into the Gaussian on a grid. A product does not care about order either.
 */
export function axisFromEvidence(evidence: number[], comparisons: Comparison[] = []): AxisBelief {
  const base = gaussianFromEvidence(evidence);
  if (comparisons.length === 0) {
    return {
      mean: Math.max(-10, Math.min(10, base.mean)),
      variance: base.variance,
      evidence: [...evidence],
      comparisons: [],
    };
  }

  const { mean, variance } = withComparisons(base, comparisons);
  return {
    mean: Math.max(-10, Math.min(10, mean)),
    variance: Math.min(INITIAL_VARIANCE, variance),
    evidence: [...evidence],
    comparisons: [...comparisons],
  };
}

function gaussianFromEvidence(evidence: number[]): { mean: number; variance: number } {
  const n = evidence.length;
  if (n === 0) return { mean: 0, variance: INITIAL_VARIANCE };

  const precision = 1 / INITIAL_VARIANCE + n / ANSWER_NOISE;
  const sum = evidence.reduce((a, z) => a + z, 0);
  const mean = sum / ANSWER_NOISE / precision;

  // One or two answers cannot disagree enough to show how much answers
  // scatter, so the observed disagreement is pooled with a typical amount
  // until enough answers arrive to speak for themselves.
  const observed = evidence.reduce((a, z) => a + (z - mean) ** 2, 0);
  const dispersion =
    (TYPICAL_SCATTER * TYPICAL_SCATTER_WEIGHT + observed) / (TYPICAL_SCATTER_WEIGHT + n);
  const variance = Math.min(
    INITIAL_VARIANCE,
    (1 / precision) * Math.max(1, dispersion / ANSWER_NOISE)
  );
  return { mean, variance };
}

const GRID_STEP = 0.05;

/** log σ(v), without overflow for large |v|. */
function logSigmoid(v: number): number {
  return v >= 0 ? -Math.log1p(Math.exp(-v)) : v - Math.log1p(Math.exp(v));
}

/** Posterior moments of a Gaussian times each pair's logistic boundary, over the map. */
function withComparisons(
  prior: { mean: number; variance: number },
  comparisons: Comparison[]
): { mean: number; variance: number } {
  const ts: number[] = [];
  const logs: number[] = [];
  for (let t = -10; t <= 10 + 1e-9; t += GRID_STEP) {
    let l = -((t - prior.mean) ** 2) / (2 * prior.variance);
    for (const { chose, over } of comparisons) {
      const midpoint = (chose + over) / 2;
      l += logSigmoid(((chose - over) * (t - midpoint)) / PAIR_NOISE);
    }
    ts.push(t);
    logs.push(l);
  }
  const peak = Math.max(...logs);
  let total = 0;
  let first = 0;
  let second = 0;
  for (let i = 0; i < ts.length; i++) {
    const w = Math.exp(logs[i] - peak);
    total += w;
    first += w * ts[i];
    second += w * ts[i] * ts[i];
  }
  const mean = first / total;
  return { mean, variance: Math.max(1e-6, second / total - mean * mean) };
}

const toEvidence = (nudge: number) => Math.max(-10, Math.min(10, nudge * EVIDENCE_SCALE));

function observe(axis: AxisBelief, nudge: number): AxisBelief {
  if (nudge === 0) return axis;
  return axisFromEvidence([...axis.evidence, toEvidence(nudge)], axis.comparisons);
}

function compare(axis: AxisBelief, chose: number, over: number): AxisBelief {
  if (chose === over) return axis;
  return axisFromEvidence(axis.evidence, [
    ...axis.comparisons,
    { chose: toEvidence(chose), over: toEvidence(over) },
  ]);
}

/**
 * Answer a question. A `pair` is read as a comparison between its two
 * options on each axis where they differ; every other type places the user
 * at the chosen option (`updateBelief`).
 */
export function answerQuestion(state: BeliefState, question: Question, option: QuestionOption): BeliefState {
  if (question.type !== 'pair' || question.options.length !== 2) return updateBelief(state, option);
  const rejected = question.options.find((o) => o !== option);
  if (!rejected) return updateBelief(state, option);
  return applyOption(state, option, {
    x: compare(state.axes.x, option.dx, rejected.dx),
    y: compare(state.axes.y, option.dy, rejected.dy),
  });
}

export function updateBelief(state: BeliefState, option: QuestionOption): BeliefState {
  return applyOption(state, option, {
    x: observe(state.axes.x, option.dx),
    y: observe(state.axes.y, option.dy),
  });
}

function applyOption(
  state: BeliefState,
  option: QuestionOption,
  axes: Record<'x' | 'y', AxisBelief>
): BeliefState {
  const newAxes = { ...state.axes, ...axes };

  // Update filters
  const newFilters = { ...state.filters };
  if (option.filterFlag) {
    newFilters[option.filterFlag.key] = option.filterFlag.value;
  }
  if (option.filterFlags) {
    for (const [key, value] of Object.entries(option.filterFlags)) {
      if (value !== undefined) {
        newFilters[key as keyof FilterState] = value;
      }
    }
  }

  // Update vibe tags
  const newVibeTags = { ...state.vibeTags };
  if (option.vibeTags) {
    option.vibeTags.forEach(tag => {
      newVibeTags[tag] = (newVibeTags[tag] || 0) + 1;
    });
  }

  return {
    axes: newAxes,
    filters: newFilters,
    vibeTags: newVibeTags,
    questionCount: state.questionCount + 1,
  };
}

export function getMaxUncertaintyAxis(state: BeliefState): string {
  let maxAxis = 'x';
  let maxVariance = -1;
  for (const [axis, belief] of Object.entries(state.axes)) {
    if (belief.variance > maxVariance) {
      maxVariance = belief.variance;
      maxAxis = axis;
    }
  }
  return maxAxis;
}

export function isComplete(state: BeliefState): boolean {
  if (state.questionCount < MIN_QUESTIONS) return false;
  if (state.questionCount >= MAX_QUESTIONS) return true;

  // All axes must be below threshold
  for (const belief of Object.values(state.axes)) {
    if (belief.variance > COMPLETION_THRESHOLD) return false;
  }

  // All filters must be resolved
  if (state.filters.dislikesSmoke === null) return false;
  if (state.filters.dislikesBitter === null) return false;
  if (state.filters.dislikesAnise === null) return false;

  return true;
}

export function getConfidenceProgress(state: BeliefState): number {
  // Average variance reduction across all axes
  const axisValues = Object.values(state.axes);
  const avgVariance = axisValues.reduce((sum, a) => sum + a.variance, 0) / axisValues.length;
  const progress = (1 - avgVariance / INITIAL_VARIANCE) * 100;
  return Math.max(0, Math.min(100, progress));
}

export function getProgressContext(state: BeliefState): {
  phase: 'early' | 'midway' | 'almost-done';
  questionsRemaining: string;
} {
  const progress = getConfidenceProgress(state);
  const remaining = MAX_QUESTIONS - state.questionCount;

  if (progress < 40 || state.questionCount <= 3) {
    return { phase: 'early', questionsRemaining: `up to ${remaining}` };
  }
  if (progress >= 75 || remaining <= 2) {
    return { phase: 'almost-done', questionsRemaining: `${remaining} or fewer` };
  }
  return { phase: 'midway', questionsRemaining: `about ${remaining}` };
}

export function beliefToProfile(state: BeliefState): UserProfile {
  return {
    x: Math.max(-10, Math.min(10, Math.round(state.axes.x.mean * 10) / 10)),
    y: Math.max(-10, Math.min(10, Math.round(state.axes.y.mean * 10) / 10)),
    dislikesSmoke: state.filters.dislikesSmoke ?? false,
    dislikesBitter: state.filters.dislikesBitter ?? false,
    dislikesAnise: state.filters.dislikesAnise ?? false,
    vibeTags: state.vibeTags,
    variance: { x: state.axes.x.variance, y: state.axes.y.variance },
  };
}

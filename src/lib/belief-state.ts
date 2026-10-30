import type { Question, QuestionOption } from './discovery-questions';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';

/**
 * Where the quiz thinks the user sits, as an exact posterior over the map.
 *
 * The map is a grid (`GRID`, every half point from −10 to 10 on both axes).
 * Each answer multiplies in the probability that a user at each point would
 * have picked that option out of the ones offered — `choiceLogits`, the same
 * response model `question-selector` uses to decide what to ask. Scoring with
 * the model the questions were chosen under is the point: the previous
 * update treated an answer as "the user is at this option", a Gaussian
 * stand-in that by simulation discarded about a fifth of the accuracy the
 * answers carried.
 *
 * How consistently people answer has not been measured, and the posterior
 * is badly overconfident if it assumes too little noise. So the noise is
 * inferred too: the posterior runs over position × `NOISE_LEVELS`, and
 * answers that contradict each other shift weight toward a noisier answerer,
 * which widens the estimate rather than pinning it between them.
 *
 * The posterior is recomputed from every answer at once, so the result does
 * not depend on answer order. A two-option pair needs no special case: its
 * likelihood is a logistic boundary at the pair's midpoint, which is what the
 * response model gives for two options.
 */

export interface AxisBelief {
  mean: number;     // posterior mean, within [-10, 10]
  variance: number; // posterior variance on this axis
}

export interface FilterState {
  dislikesSmoke: boolean | null;
  dislikesBitter: boolean | null;
  dislikesAnise: boolean | null;
}

/** Where each offered option places a user, on the axes the question uses. */
export type OptionLocation = { x: number | null; y: number | null };

export interface Answer {
  options: OptionLocation[];
  chosen: number;
  /** Multiplies the answerer's noise level; 1 except for pairs. */
  noiseScale: number;
}

/**
 * One answered question as it was asked: the options' authored nudges and
 * which was taken. Unlike `answers` this keeps every question, including
 * ones that carry no position, and the raw nudges rather than where the
 * current EVIDENCE_SCALE puts them — it is what gets logged
 * (app.cotidal.elicitation) so the model can be re-fitted later.
 */
export interface QuizResponse {
  questionId: string;
  kind: 'triad' | 'pair' | 'single';
  generated: boolean;
  options: { dx: number; dy: number }[];
  chosen: number;
}

export interface BeliefState {
  answers: Answer[];
  responses: QuizResponse[];
  /** Normalised weight of each `CELLS` entry: a grid point at a noise level. */
  posterior: number[];
  axes: Record<'x' | 'y', AxisBelief>;
  filters: FilterState;
  vibeTags: Record<string, number>;
  questionCount: number;
}

/** Names the model below in logged answers; change it when the model changes. */
export const RESPONSE_MODEL = 'softmax-grid-1';

// How far one answer places the user per unit of its authored nudge. The
// strongest nudges in the bank (|d| = 4-5) place the user at the edge of the map.
export const EVIDENCE_SCALE = 2.5;

// The response model: a user at t, answering with noise s, picks each option
// with probability ∝ exp(−|z − t|² / 2s), z being where the option places
// them. s is not known per user, so the posterior carries these levels with
// these prior weights and lets the answers choose. Simulated users at 1×, 2×
// and 4× the base level are each estimated better than by the old update.
// None of it is calibrated against real answers yet.
export const ANSWER_NOISE = 12;
export const NOISE_LEVELS: readonly { noise: number; prior: number }[] = [
  { noise: ANSWER_NOISE, prior: 0.5 },
  { noise: ANSWER_NOISE * 2, prior: 0.3 },
  { noise: ANSWER_NOISE * 4, prior: 0.2 },
];

// A forced-choice pair's noise relative to other answers. Comparative
// judgements are often argued to be steadier than absolute ones, but nothing
// here has measured that, so it starts at 1. Pours are the data that could
// calibrate it.
export const PAIR_NOISE_SCALE = 1;

// The prior on each axis before any answer: centred, sd 5, cut off at the
// edge of the map.
const PRIOR_VARIANCE = 25;

// Stop once both axes are this certain. Tuned by simulation against the bank
// with users answering at 1×, 2× and 4× ANSWER_NOISE: at 5 the quiz is more
// accurate than the old Gaussian update at every one of those levels and asks
// slightly fewer questions. Lower buys accuracy for length (4 adds about
// 0.7 questions for a few percent).
const COMPLETION_THRESHOLD = 5;
const MIN_QUESTIONS = 4;
export const MAX_QUESTIONS = 8;

const GRID_STEP = 0.5;

/** The coordinates the grid takes on each axis. */
export const TICKS: readonly number[] = Array.from(
  { length: Math.round(20 / GRID_STEP) + 1 },
  (_, i) => -10 + i * GRID_STEP
);

/** Every point of the map the posterior is kept on; index = ix·TICKS + iy. */
export const GRID: readonly { x: number; y: number }[] = TICKS.flatMap((x) => TICKS.map((y) => ({ x, y })));

/** What the posterior weighs: each grid point at each noise level; index = level·GRID + point. */
export const CELLS: readonly { x: number; y: number; noise: number }[] = NOISE_LEVELS.flatMap(({ noise }) =>
  GRID.map(({ x, y }) => ({ x, y, noise }))
);

const PRIOR_LOGS = NOISE_LEVELS.flatMap(({ prior }) =>
  GRID.map(({ x, y }) => Math.log(prior) - (x * x + y * y) / (2 * PRIOR_VARIANCE))
);

const clampEvidence = (v: number) => Math.max(-10, Math.min(10, v));

/** How this question's noise compares with the answerer's level. */
export function noiseScaleFor(question: Question): number {
  return question.type === 'pair' ? PAIR_NOISE_SCALE : 1;
}

/**
 * Where each option places a user. An axis counts only if some option moves
 * along it; on such an axis an option authored at 0 sits at the centre.
 */
export function optionLocations(question: Question): OptionLocation[] {
  const usesX = question.options.some((o) => o.dx !== 0);
  const usesY = question.options.some((o) => o.dy !== 0);
  return question.options.map((o) => ({
    x: usesX ? clampEvidence(o.dx * EVIDENCE_SCALE) : null,
    y: usesY ? clampEvidence(o.dy * EVIDENCE_SCALE) : null,
  }));
}

/**
 * The response model, one axis at a time: an option's pull on a user at `t`.
 * An option's weight is the product over axes, and its probability that
 * weight over the sum of all the options' weights.
 */
function axisFactor(z: number | null, t: number, noise: number): number {
  return z === null ? 1 : Math.exp(-((z - t) ** 2) / (2 * noise));
}

/** Probability of each option for a user at (x, y) answering with `noise`. */
export function choiceProbs(options: OptionLocation[], noise: number, x: number, y: number): number[] {
  const w = options.map((o) => axisFactor(o.x, x, noise) * axisFactor(o.y, y, noise));
  const total = w.reduce((a, v) => a + v, 0);
  return w.map((v) => v / total);
}

/**
 * `choiceProbs` for every grid point at once. Because the model factors by
 * axis, each option needs one row of factors per axis, and a grid point's
 * probabilities are products from those rows — no exponentials in the loop
 * over the grid, which is what keeps selection fast enough to run on tap.
 */
export interface ChoiceTable {
  fx: Float64Array[];
  fy: Float64Array[];
}

export function choiceTable(options: OptionLocation[], noise: number): ChoiceTable {
  const row = (z: number | null) => Float64Array.from(TICKS, (t) => axisFactor(z, t, noise));
  return { fx: options.map((o) => row(o.x)), fy: options.map((o) => row(o.y)) };
}

/** Fill `out` with the option probabilities at grid point (ix, iy); returns `out`. */
export function probsAt(table: ChoiceTable, ix: number, iy: number, out: Float64Array): Float64Array {
  let total = 0;
  for (let k = 0; k < out.length; k++) {
    out[k] = table.fx[k][ix] * table.fy[k][iy];
    total += out[k];
  }
  for (let k = 0; k < out.length; k++) out[k] /= total;
  return out;
}

const N = TICKS.length;

function posteriorFrom(answers: Answer[]): number[] {
  const logs = PRIOR_LOGS.slice();
  for (const a of answers) {
    const out = new Float64Array(a.options.length);
    NOISE_LEVELS.forEach(({ noise }, l) => {
      const table = choiceTable(a.options, noise * a.noiseScale);
      for (let ix = 0; ix < N; ix++) {
        for (let iy = 0; iy < N; iy++) {
          logs[l * GRID.length + ix * N + iy] += Math.log(probsAt(table, ix, iy, out)[a.chosen]);
        }
      }
    });
  }
  const peak = Math.max(...logs);
  const weights = logs.map((l) => Math.exp(l - peak));
  const total = weights.reduce((a, w) => a + w, 0);
  return weights.map((w) => w / total);
}

function marginal(posterior: number[], axis: 'x' | 'y'): AxisBelief {
  let first = 0;
  let second = 0;
  posterior.forEach((w, i) => {
    const v = CELLS[i][axis];
    first += w * v;
    second += w * v * v;
  });
  return { mean: Math.max(-10, Math.min(10, first)), variance: Math.max(0, second - first * first) };
}

function fromAnswers(answers: Answer[]): Pick<BeliefState, 'answers' | 'posterior' | 'axes'> {
  const posterior = posteriorFrom(answers);
  return { answers, posterior, axes: { x: marginal(posterior, 'x'), y: marginal(posterior, 'y') } };
}

const PRIOR = fromAnswers([]);

/** The prior's variance on each axis — what "no information yet" looks like. */
export const INITIAL_VARIANCE = PRIOR.axes.x.variance;

export function createInitialBelief(): BeliefState {
  return {
    ...PRIOR,
    responses: [],
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
 * Answer a question: the chosen option's position evidence, aversions and
 * vibe tags. The option is matched by identity, then by text, so an equal
 * copy (one that has been serialised and read back) counts as the same answer.
 */
export function answerQuestion(state: BeliefState, question: Question, option: QuestionOption): BeliefState {
  let chosen = question.options.indexOf(option);
  if (chosen < 0) chosen = question.options.findIndex((o) => o.text === option.text);

  const options = optionLocations(question);
  const informative = chosen >= 0 && options.some((o) => o.x !== null || o.y !== null);
  const position = informative
    ? fromAnswers([...state.answers, { options, chosen, noiseScale: noiseScaleFor(question) }])
    : { answers: state.answers, posterior: state.posterior, axes: state.axes };

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

  const responses: QuizResponse[] =
    chosen < 0
      ? state.responses
      : [
          ...state.responses,
          {
            questionId: question.id,
            kind: question.type === 'triad' || question.type === 'pair' ? question.type : 'single',
            generated: !!question.isAIGenerated,
            options: question.options.map(({ dx, dy }) => ({ dx, dy })),
            chosen,
          },
        ];

  return {
    ...position,
    responses,
    filters: newFilters,
    vibeTags: newVibeTags,
    questionCount: state.questionCount + 1,
  };
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

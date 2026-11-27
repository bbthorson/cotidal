import { questions, type Question, type QuestionOption } from './discovery-questions';
import {
  GRID,
  NOISE_LEVELS,
  TICKS,
  choiceTable,
  probsAt,
  noiseScaleFor,
  optionLocations,
  type BeliefState,
  type FilterState,
} from './belief-state';

// The fixed openers, asked in this order. These four are the only fixed part
// of the quiz; after them every question is chosen by expected information.
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

// Grid points carrying less posterior weight than this cannot change the
// answer distribution measurably, and skipping them keeps selection cheap.
const NEGLIGIBLE_WEIGHT = 1e-7;

function resolvedAversions(belief: BeliefState, option: QuestionOption): number {
  const set = { ...option.filterFlags };
  if (option.filterFlag) set[option.filterFlag.key] = option.filterFlag.value;
  return (Object.keys(set) as (keyof FilterState)[]).filter(
    (k) => set[k] !== undefined && belief.filters[k] === null
  ).length;
}

function entropy(p: ArrayLike<number>): number {
  let h = 0;
  for (let i = 0; i < p.length; i++) if (p[i] > 0) h -= p[i] * Math.log(p[i]);
  return h;
}

/**
 * How much a question is expected to tell us, in nats, plus AVERSION_WEIGHT
 * for each open aversion its likely answer would resolve.
 *
 * The information part is the mutual information between the answer and the
 * user's position: how unpredictable the answer is overall, less how
 * unpredictable it would be if we knew where they sat. Both are taken over
 * the belief's posterior (position × noise level), with the response model
 * belief-state scores answers by (`choiceProbs`), so a question is valued
 * by exactly the update its answer will make.
 *
 * Scoring by expected drop in reported variance instead rewards questions
 * whose likely answer agrees with the current belief, which sharpens the
 * reported confidence without sharpening the estimate.
 */
export function expectedGain(belief: BeliefState, question: Question): number {
  const options = optionLocations(question);
  const scale = noiseScaleFor(question);
  const positional = options.some((o) => o.x !== null || o.y !== null);

  const marginal = question.options.map(() => 0);
  let conditional = 0;
  let mass = 0;
  if (positional) {
    // Information about position, not about how noisy the answerer is: at
    // each map point the answer distribution is averaged over noise levels
    // before its entropy is taken.
    const tables = NOISE_LEVELS.map(({ noise }) => choiceTable(options, noise * scale));
    const n = TICKS.length;
    const p = new Float64Array(options.length);
    const at = new Float64Array(options.length);
    for (let ix = 0; ix < n; ix++) {
      for (let iy = 0; iy < n; iy++) {
        const g = ix * n + iy;
        let weight = 0;
        p.fill(0);
        for (let l = 0; l < tables.length; l++) {
          const w = belief.posterior[l * GRID.length + g];
          if (w < NEGLIGIBLE_WEIGHT) continue;
          probsAt(tables[l], ix, iy, at);
          for (let k = 0; k < p.length; k++) p[k] += w * at[k];
          weight += w;
        }
        if (weight === 0) continue;
        for (let k = 0; k < p.length; k++) {
          marginal[k] += p[k];
          p[k] /= weight;
        }
        conditional += weight * entropy(p);
        mass += weight;
      }
    }
  } else {
    // No position evidence: every user answers alike, as far as the map goes.
    marginal.fill(1 / question.options.length);
    mass = 1;
  }
  for (let k = 0; k < marginal.length; k++) marginal[k] /= mass;
  const information = positional ? Math.max(0, entropy(marginal) - conditional / mass) : 0;

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

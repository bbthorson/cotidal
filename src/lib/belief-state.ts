import type { QuestionOption } from './discovery-questions';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import { createInitialPalateState, type PalateState } from './palate-state';

export interface AxisBelief {
  mean: number;       // current estimate, bounded [-10, 10]
  variance: number;   // uncertainty — starts at 25, falls as answers agree
  evidence: number[]; // where each answer placed the user on this axis
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
const EVIDENCE_SCALE = 2.5;

// Variance of a single answer as evidence of position. Three agreeing answers
// on an axis bring it under COMPLETION_THRESHOLD.
const ANSWER_NOISE = 12;
const COMPLETION_THRESHOLD = 3.5;
const MIN_QUESTIONS = 4;
export const MAX_QUESTIONS = 8;

export function createInitialBelief(): BeliefState {
  return {
    axes: {
      x: { mean: 0, variance: INITIAL_VARIANCE, evidence: [] },
      y: { mean: 0, variance: INITIAL_VARIANCE, evidence: [] },
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
 */
export function axisFromEvidence(evidence: number[]): AxisBelief {
  const n = evidence.length;
  if (n === 0) return { mean: 0, variance: INITIAL_VARIANCE, evidence: [] };

  const precision = 1 / INITIAL_VARIANCE + n / ANSWER_NOISE;
  const sum = evidence.reduce((a, z) => a + z, 0);
  const mean = sum / ANSWER_NOISE / precision;

  const dispersion = evidence.reduce((a, z) => a + (z - mean) ** 2, 0) / n;
  const variance = Math.min(
    INITIAL_VARIANCE,
    (1 / precision) * Math.max(1, dispersion / ANSWER_NOISE)
  );

  return {
    mean: Math.max(-10, Math.min(10, mean)),
    variance,
    evidence: [...evidence],
  };
}

function observe(axis: AxisBelief, nudge: number): AxisBelief {
  if (nudge === 0) return axis;
  const z = Math.max(-10, Math.min(10, nudge * EVIDENCE_SCALE));
  return axisFromEvidence([...axis.evidence, z]);
}

export function updateBelief(state: BeliefState, option: QuestionOption): BeliefState {
  const newAxes = {
    ...state.axes,
    x: observe(state.axes.x, option.dx),
    y: observe(state.axes.y, option.dy),
  };

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
  };
}

export function beliefToPalateState(state: BeliefState): PalateState {
  const profile = beliefToProfile(state);
  const palate = createInitialPalateState({
    x: profile.x,
    y: profile.y,
    dislikesBitter: profile.dislikesBitter,
  });
  if (state.axes.x) {
    palate.covariance[0][0] = Math.max(1.0, state.axes.x.variance);
  }
  if (state.axes.y) {
    palate.covariance[1][1] = Math.max(1.0, state.axes.y.variance);
  }
  return palate;
}

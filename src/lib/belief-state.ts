import type { QuestionOption } from './discovery-questions';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';

export interface AxisBelief {
  mean: number;      // current estimate, bounded [-10, 10]
  variance: number;  // uncertainty — starts at 25, converges toward 0
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
const COMPLETION_THRESHOLD = 3.5;
const MIN_QUESTIONS = 4;
const MAX_QUESTIONS = 8;

export function createInitialBelief(): BeliefState {
  return {
    axes: {
      x: { mean: 0, variance: INITIAL_VARIANCE },
      y: { mean: 0, variance: INITIAL_VARIANCE },
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

export function updateBelief(state: BeliefState, option: QuestionOption): BeliefState {
  const newAxes = { ...state.axes };

  // Update x axis
  if (option.dx !== 0) {
    const prev = newAxes.x;
    const shrink = Math.min(0.5, Math.abs(option.dx) / 8);
    newAxes.x = {
      mean: Math.max(-10, Math.min(10, prev.mean + option.dx)),
      variance: prev.variance * (1 - shrink),
    };
  }

  // Update y axis
  if (option.dy !== 0) {
    const prev = newAxes.y;
    const shrink = Math.min(0.5, Math.abs(option.dy) / 8);
    newAxes.y = {
      mean: Math.max(-10, Math.min(10, prev.mean + option.dy)),
      variance: prev.variance * (1 - shrink),
    };
  }

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

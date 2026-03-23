import { questions, type Question } from './discovery-questions';
import type { BeliefState } from './belief-state';
import { getMaxUncertaintyAxis } from './belief-state';

// First 3 questions are always calibration (cold start)
const CALIBRATION_IDS = ['coffee', 'dessert', 'bitter_tol'];

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

  // After calibration: pick from remaining pool targeting highest-uncertainty axis
  const targetAxis = getMaxUncertaintyAxis(belief);

  const candidates = questions
    .filter(q => !answeredIds.has(q.id))
    .sort((a, b) => {
      // Prefer questions targeting the most uncertain axis
      const aMatchesTarget = a.primaryAxis === targetAxis ? 1 : 0;
      const bMatchesTarget = b.primaryAxis === targetAxis ? 1 : 0;
      if (aMatchesTarget !== bMatchesTarget) return bMatchesTarget - aMatchesTarget;
      // Among same-axis questions, prefer higher information gain
      return b.informationGain - a.informationGain;
    });

  return candidates[0] ?? null;
}

// Fallback: pick from non-calibration hardcoded pool (skips calibration IDs)
export function selectFallbackQuestion(
  belief: BeliefState,
  answeredIds: Set<string>,
): Question | null {
  const targetAxis = getMaxUncertaintyAxis(belief);

  const candidates = questions
    .filter(q => !answeredIds.has(q.id) && !CALIBRATION_IDS.includes(q.id))
    .sort((a, b) => {
      const aMatchesTarget = a.primaryAxis === targetAxis ? 1 : 0;
      const bMatchesTarget = b.primaryAxis === targetAxis ? 1 : 0;
      if (aMatchesTarget !== bMatchesTarget) return bMatchesTarget - aMatchesTarget;
      return b.informationGain - a.informationGain;
    });

  return candidates[0] ?? null;
}

export function getTierLabel(question: Question): string {
  switch (question.tier) {
    case 'calibration': return 'The Basics';
    case 'architecture': return 'Your Style';
    case 'context': return 'The Details';
  }
}

import { questions, type Question, type QuestionCategory } from './discovery-questions';
import type { BeliefState } from './belief-state';
import { getMaxUncertaintyAxis } from './belief-state';

// The 4 Sommelier Triads: Negative Elimination cold start
const CALIBRATION_IDS = [
  'triad_sugar_texture',
  'triad_bitter_botanical',
  'triad_smoke_oak',
  'triad_proof_tempo',
];

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

export function getCategoryLabel(category: QuestionCategory): string {
  switch (category) {
    case 'palate': return 'The Palate';
    case 'architecture': return 'The Method';
    case 'ritual': return 'The Ritual';
    case 'occasion': return 'The Hour';
  }
}

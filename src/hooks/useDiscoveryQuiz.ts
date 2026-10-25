import { useState, useCallback, useRef } from 'react';
import { drinkDatabase } from '@/lib/data';
import { questions as questionPool, type Question, type QuestionOption } from '@/lib/discovery-questions';
import { calculateDistance } from '@/lib/scoring';
import { publishPalate, publishElicitation } from '@/lib/api-client';
import { toElicitationRecord } from '@/lib/elicitation';
import {
  type BeliefState,
  createInitialBelief,
  answerQuestion,
  isComplete as beliefIsComplete,
  getConfidenceProgress,
  beliefToProfile,
} from '@/lib/belief-state';
import { selectNextQuestion, selectFallbackQuestion, getTierLabel, getCategoryLabel } from '@/lib/question-selector';

/**
 * How long the chosen plate holds its letterpress offset before the next
 * question replaces it. Long enough to see the choice land; short enough
 * that the quiz still feels like it advances on its own.
 */
const ADVANCE_MS = 450;

export interface UserProfile {
  x: number;
  y: number;
  dislikesSmoke: boolean;
  dislikesBitter: boolean;
  dislikesAnise: boolean;
  vibeTags: Record<string, number>;
  /** How sure the quiz is of x and y. Absent on profiles saved before it was kept. */
  variance?: { x: number; y: number };
}

export interface RecommendedDrink {
  name: string;
  score: number;
}

export interface AnswerResult {
  prevTier: string;
  newTier: string;
  tierChanged: boolean;
  isComplete: boolean;
  needsAIQuestion: boolean;
  beliefState: BeliefState;
}

interface HistoryStep {
  belief: BeliefState;
  questionId: string;
  answeredIds: Set<string>;
}

export function useDiscoveryQuiz(onComplete: (profile: UserProfile) => void) {
  const [belief, setBelief] = useState<BeliefState>(createInitialBelief);
  const answeredIdsRef = useRef<Set<string>>(new Set());
  const [answeredIdsState, setAnsweredIdsState] = useState<Set<string>>(() => new Set());
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [history, setHistory] = useState<HistoryStep[]>([]);

  // Store AI-generated questions so they can be looked up by ID
  const aiQuestionsRef = useRef<Map<string, Question>>(new Map());
  const [aiQuestionsState, setAiQuestionsState] = useState<Map<string, Question>>(() => new Map());

  const currentQuestion = (() => {
    if (currentQuestionId) {
      // Check AI questions first, then hardcoded pool
      const aiQ = aiQuestionsState.get(currentQuestionId);
      if (aiQ) return aiQ;
      const poolQ = questionPool.find(q => q.id === currentQuestionId);
      if (poolQ) return poolQ;
    }
    return selectNextQuestion(belief, answeredIdsState);
  })();

  const progress = getConfidenceProgress(belief);
  const tierLabel = currentQuestion ? getTierLabel(currentQuestion) : 'The Details';
  const categoryLabel = currentQuestion ? getCategoryLabel(currentQuestion.category) : 'The Palate';

  const finishQuiz = useCallback((finalBelief: BeliefState) => {
    const finalProfile = beliefToProfile(finalBelief);
    const candidates = drinkDatabase.filter(d => {
      if (finalProfile.dislikesSmoke && d.hasSmoke) return false;
      if (finalProfile.dislikesBitter && d.isBitter) return false;
      if (finalProfile.dislikesAnise && d.hasAnise) return false;
      return true;
    });

    const scoredCandidates = candidates.map(drink => {
      const dist = calculateDistance(finalProfile, drink);
      return { ...drink, distance: dist, score: 0 };
    });

    scoredCandidates.sort((a, b) => a.distance - b.distance);
    const topCandidates = scoredCandidates.slice(0, 10);

    const rankedCandidates = topCandidates.map(drink => {
      let matchScore = 0;
      drink.tags.forEach(tag => {
        if (finalProfile.vibeTags[tag]) {
          matchScore += finalProfile.vibeTags[tag];
        }
      });
      const distanceScore = 10 - Math.min(10, drink.distance);
      return { ...drink, score: distanceScore + (matchScore * 0.5) };
    });

    rankedCandidates.sort((a, b) => b.score - a.score);

    localStorage.setItem('user_profile', JSON.stringify(finalProfile));

    // Automatically sync to AT Protocol if connected
    publishPalate(finalProfile).catch(e => {
      console.warn("Failed to auto-publish to AT Protocol:", e);
    });

    // The answers behind the coordinate, so the response model can later be
    // calibrated against this person's pours. Kept on the device until a
    // write succeeds, which for a guest is after they sign in.
    const answers = toElicitationRecord(finalBelief.responses);
    if (answers) void publishElicitation(answers);

    onComplete(finalProfile);
  }, [onComplete]);

  const handleAnswer = useCallback((option: QuestionOption, _index: number): AnswerResult => {
    if (isNavigating || !currentQuestion) {
      return { prevTier: 'context', newTier: 'context', tierChanged: false, isComplete: false, needsAIQuestion: false, beliefState: belief };
    }
    setIsNavigating(true);
    // Pin the question being answered. The first question is otherwise
    // derived from the answered set, which changes below, so it would be
    // replaced at once instead of holding the chosen plate until the advance.
    setCurrentQuestionId(currentQuestion.id);

    // Save step into history for back-navigation
    setHistory(prev => [
      ...prev,
      {
        belief,
        questionId: currentQuestion.id,
        answeredIds: new Set(answeredIdsRef.current),
      }
    ]);

    const prevTier = currentQuestion.tier;
    answeredIdsRef.current.add(currentQuestion.id);
    setAnsweredIdsState(new Set(answeredIdsRef.current));

    const newBelief = answerQuestion(belief, currentQuestion, option);

    // Check if quiz is complete
    if (beliefIsComplete(newBelief)) {
      setBelief(newBelief);
      setTimeout(() => {
        finishQuiz(newBelief);
      }, ADVANCE_MS);
      return { prevTier, newTier: prevTier, tierChanged: false, isComplete: true, needsAIQuestion: false, beliefState: newBelief };
    }

    // Select next question synchronously
    const nextQuestion = selectNextQuestion(newBelief, answeredIdsRef.current);

    if (!nextQuestion) {
      setBelief(newBelief);
      setTimeout(() => {
        finishQuiz(newBelief);
      }, ADVANCE_MS);
      return { prevTier, newTier: prevTier, tierChanged: false, isComplete: true, needsAIQuestion: false, beliefState: newBelief };
    }

    const newTier = nextQuestion.tier;
    const tierChanged = newTier !== prevTier;

    setTimeout(() => {
      setBelief(newBelief);
      setCurrentQuestionId(nextQuestion.id);
      setIsNavigating(false);
    }, ADVANCE_MS);

    return { prevTier, newTier, tierChanged, isComplete: false, needsAIQuestion: false, beliefState: newBelief };
  }, [isNavigating, currentQuestion, belief, finishQuiz]);

  const handleBack = useCallback(() => {
    if (history.length === 0 || isNavigating) return;
    const previous = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));

    answeredIdsRef.current = previous.answeredIds;
    setAnsweredIdsState(new Set(previous.answeredIds));
    setBelief(previous.belief);
    setCurrentQuestionId(previous.questionId);
    setIsNavigating(false);
  }, [history, isNavigating]);

  const setAIQuestion = useCallback((question: Question) => {
    aiQuestionsRef.current.set(question.id, question);
    setAiQuestionsState(new Map(aiQuestionsRef.current));
    setCurrentQuestionId(question.id);
    setIsNavigating(false);
  }, []);

  // Fallback to hardcoded pool when AI fails
  const setFallbackQuestion = useCallback(() => {
    const fallback = selectFallbackQuestion(belief, answeredIdsRef.current);
    if (fallback) {
      setCurrentQuestionId(fallback.id);
      setIsNavigating(false);
    } else {
      // No more questions — force completion
      finishQuiz(belief);
    }
  }, [belief, finishQuiz]);

  const resetQuiz = useCallback(() => {
    setBelief(createInitialBelief());
    answeredIdsRef.current = new Set();
    setAnsweredIdsState(new Set());
    aiQuestionsRef.current = new Map();
    setAiQuestionsState(new Map());
    setCurrentQuestionId(null);
    setIsNavigating(false);
    setHistory([]);
  }, []);

  return {
    currentQuestion,
    currentTier: currentQuestion?.tier ?? 'context',
    progress,
    tierLabel,
    categoryLabel,
    isNavigating,
    belief,
    questionCount: belief.questionCount,
    canGoBack: history.length > 0,
    handleAnswer,
    handleBack,
    setAIQuestion,
    setFallbackQuestion,
    resetQuiz,
  };
}

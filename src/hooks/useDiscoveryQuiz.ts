'use client';
import { useState, useCallback, useRef } from 'react';
import { drinkDatabase } from '@/lib/data';
import { questions as questionPool, type Question, type QuestionOption } from '@/lib/discovery-questions';
import { calculateDistance } from '@/lib/scoring';
import { publishPalate } from '@/app/actions/atproto-publish';
import {
  type BeliefState,
  createInitialBelief,
  updateBelief,
  isComplete as beliefIsComplete,
  getConfidenceProgress,
  beliefToProfile,
} from '@/lib/belief-state';
import { selectNextQuestion, selectFallbackQuestion, getTierLabel } from '@/lib/question-selector';

const CALIBRATION_COUNT = 3;

export interface UserProfile {
  x: number;
  y: number;
  dislikesSmoke: boolean;
  dislikesBitter: boolean;
  dislikesAnise: boolean;
  vibeTags: Record<string, number>;
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

export function useDiscoveryQuiz(onComplete: (profile: UserProfile) => void) {
  const [belief, setBelief] = useState<BeliefState>(createInitialBelief);
  const answeredIdsRef = useRef<Set<string>>(new Set());
  const [answeredIdsState, setAnsweredIdsState] = useState<Set<string>>(() => new Set());
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
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

  const finishQuiz = useCallback((finalProfile: UserProfile) => {
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

    onComplete(finalProfile);
  }, [onComplete]);

  const handleAnswer = useCallback((option: QuestionOption, _index: number): AnswerResult => {
    if (isNavigating || !currentQuestion) {
      return { prevTier: 'context', newTier: 'context', tierChanged: false, isComplete: false, needsAIQuestion: false, beliefState: belief };
    }
    setIsNavigating(true);

    const prevTier = currentQuestion.tier;
    answeredIdsRef.current.add(currentQuestion.id);
    setAnsweredIdsState(new Set(answeredIdsRef.current));

    const newBelief = updateBelief(belief, option);

    // Check if quiz is complete
    if (beliefIsComplete(newBelief)) {
      setBelief(newBelief);
      setTimeout(() => {
        finishQuiz(beliefToProfile(newBelief));
      }, 600);
      return { prevTier, newTier: prevTier, tierChanged: false, isComplete: true, needsAIQuestion: false, beliefState: newBelief };
    }

    // Post-calibration: let the orchestrator handle AI question generation
    if (newBelief.questionCount >= CALIBRATION_COUNT) {
      setBelief(newBelief);
      // Don't select next question or clear isNavigating — orchestrator will call setAIQuestion or setFallbackQuestion
      return { prevTier, newTier: prevTier, tierChanged: false, isComplete: false, needsAIQuestion: true, beliefState: newBelief };
    }

    // Calibration phase: select next hardcoded question synchronously
    const nextQuestion = selectNextQuestion(newBelief, answeredIdsRef.current);

    if (!nextQuestion) {
      setBelief(newBelief);
      setTimeout(() => {
        finishQuiz(beliefToProfile(newBelief));
      }, 600);
      return { prevTier, newTier: prevTier, tierChanged: false, isComplete: true, needsAIQuestion: false, beliefState: newBelief };
    }

    const newTier = nextQuestion.tier;
    const tierChanged = newTier !== prevTier;

    setTimeout(() => {
      setBelief(newBelief);
      setCurrentQuestionId(nextQuestion.id);
      setIsNavigating(false);
    }, 600);

    return { prevTier, newTier, tierChanged, isComplete: false, needsAIQuestion: false, beliefState: newBelief };
  }, [isNavigating, currentQuestion, belief, finishQuiz]);

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
      finishQuiz(beliefToProfile(belief));
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
  }, []);

  return {
    currentQuestion,
    currentTier: currentQuestion?.tier ?? 'context',
    progress,
    tierLabel,
    isNavigating,
    belief,
    handleAnswer,
    setAIQuestion,
    setFallbackQuestion,
    resetQuiz,
  };
}

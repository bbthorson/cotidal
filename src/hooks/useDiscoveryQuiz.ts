'use client';
import { useState, useCallback, useRef } from 'react';
import { drinkDatabase } from '@/lib/data';
import { questions as questionPool, type QuestionOption } from '@/lib/discovery-questions';
import { calculateDistance } from '@/lib/scoring';
import { auth } from '@/lib/firebase';
import { saveUserProfile } from '@/lib/profile-service';
import {
  type BeliefState,
  createInitialBelief,
  updateBelief,
  isComplete as beliefIsComplete,
  getConfidenceProgress,
  beliefToProfile,
} from '@/lib/belief-state';
import { selectNextQuestion, getTierLabel } from '@/lib/question-selector';

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
}

export function useDiscoveryQuiz(onComplete: (profile: UserProfile) => void) {
  const [belief, setBelief] = useState<BeliefState>(createInitialBelief);
  const answeredIdsRef = useRef<Set<string>>(new Set());
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const currentQuestion = currentQuestionId
    ? questionPool.find(q => q.id === currentQuestionId) ?? selectNextQuestion(belief, answeredIdsRef.current)
    : selectNextQuestion(belief, answeredIdsRef.current);
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

    if (auth.currentUser) {
      saveUserProfile(auth.currentUser.uid, finalProfile).catch(e => {
        console.error("Failed to sync profile to Firestore", e);
      });
    }

    onComplete(finalProfile);
  }, [onComplete]);

  const handleAnswer = useCallback((option: QuestionOption, _index: number): AnswerResult => {
    if (isNavigating || !currentQuestion) {
      return { prevTier: 'context', newTier: 'context', tierChanged: false, isComplete: false };
    }
    setIsNavigating(true);

    const prevTier = currentQuestion.tier;
    answeredIdsRef.current.add(currentQuestion.id);

    const newBelief = updateBelief(belief, option);

    // Check if quiz is complete
    if (beliefIsComplete(newBelief)) {
      setBelief(newBelief);
      setTimeout(() => {
        finishQuiz(beliefToProfile(newBelief));
      }, 600);
      return { prevTier, newTier: prevTier, tierChanged: false, isComplete: true };
    }

    // Select next question
    const nextQuestion = selectNextQuestion(newBelief, answeredIdsRef.current);

    // No more questions available — force completion
    if (!nextQuestion) {
      setBelief(newBelief);
      setTimeout(() => {
        finishQuiz(beliefToProfile(newBelief));
      }, 600);
      return { prevTier, newTier: prevTier, tierChanged: false, isComplete: true };
    }

    const newTier = nextQuestion.tier;
    const tierChanged = newTier !== prevTier;

    setTimeout(() => {
      setBelief(newBelief);
      setCurrentQuestionId(nextQuestion.id);
      setIsNavigating(false);
    }, 600);

    return { prevTier, newTier, tierChanged, isComplete: false };
  }, [isNavigating, currentQuestion, belief, finishQuiz]);

  const resetQuiz = useCallback(() => {
    setBelief(createInitialBelief());
    answeredIdsRef.current = new Set();
    setCurrentQuestionId(null);
    setIsNavigating(false);
  }, []);

  return {
    currentQuestion,
    currentTier: currentQuestion?.tier ?? 'context',
    progress,
    tierLabel,
    isNavigating,
    handleAnswer,
    resetQuiz,
  };
}

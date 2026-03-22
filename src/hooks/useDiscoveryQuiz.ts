'use client';
import { useState, useCallback } from 'react';
import { questions, drinkDatabase, QuestionTier, QuestionOption } from '@/lib/data';
import { calculateDistance } from '@/lib/scoring';
import { auth } from '@/lib/firebase';
import { saveUserProfile } from '@/lib/profile-service';

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

// Filter questions by tier outside the hook
const calibrationQuestions = questions.filter(q => q.tier === 'calibration');
const architectureQuestions = questions.filter(q => q.tier === 'architecture');
const contextQuestions = questions.filter(q => q.tier === 'context');

const TIER_OFFSETS = {
  calibration: 0,
  architecture: calibrationQuestions.length,
  context: calibrationQuestions.length + architectureQuestions.length,
};

const TIER_LABELS: Record<QuestionTier, string> = {
  calibration: 'The Basics',
  architecture: 'Your Style',
  context: 'The Details',
};

function getQuestionsForTier(tier: QuestionTier) {
  switch (tier) {
    case 'calibration': return calibrationQuestions;
    case 'architecture': return architectureQuestions;
    case 'context': return contextQuestions;
  }
}

export interface AnswerResult {
  prevTier: QuestionTier;
  newTier: QuestionTier;
  tierChanged: boolean;
  isComplete: boolean;
}

export function useDiscoveryQuiz(onComplete: (profile: UserProfile) => void) {
  const [profile, setProfile] = useState<UserProfile>({
    x: 0, y: 0,
    dislikesSmoke: false,
    dislikesBitter: false,
    dislikesAnise: false,
    vibeTags: {},
  });

  const [currentTier, setCurrentTier] = useState<QuestionTier>('calibration');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  const currentQuestions = getQuestionsForTier(currentTier);
  const currentQuestion = currentQuestions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const globalIndex = TIER_OFFSETS[currentTier] + currentQuestionIndex;
  const progress = ((globalIndex + 1) / totalQuestions) * 100;
  const tierLabel = TIER_LABELS[currentTier];

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

  const handleAnswer = useCallback((option: QuestionOption, index: number): AnswerResult => {
    if (isNavigating) return { prevTier: currentTier, newTier: currentTier, tierChanged: false, isComplete: false };
    setIsNavigating(true);

    const newProfile = { ...profile };
    newProfile.x = Math.max(-10, Math.min(10, newProfile.x + option.dx));
    newProfile.y = Math.max(-10, Math.min(10, newProfile.y + option.dy));

    if (option.filterFlag) {
      if (option.filterFlag.key === 'dislikesSmoke') newProfile.dislikesSmoke = option.filterFlag.value;
      if (option.filterFlag.key === 'dislikesBitter') newProfile.dislikesBitter = option.filterFlag.value;
      if (option.filterFlag.key === 'dislikesAnise') newProfile.dislikesAnise = option.filterFlag.value;
    }

    if (option.vibeTags) {
      newProfile.vibeTags = { ...newProfile.vibeTags };
      option.vibeTags.forEach(tag => {
        newProfile.vibeTags[tag] = (newProfile.vibeTags[tag] || 0) + 1;
      });
    }

    setProfile(newProfile);

    const prevTier = currentTier;
    const tierQuestions = getQuestionsForTier(currentTier);

    if (currentQuestionIndex < tierQuestions.length - 1) {
      // Next question in same tier
      setTimeout(() => {
        setCurrentQuestionIndex(i => i + 1);
        setIsNavigating(false);
      }, 600);
      return { prevTier, newTier: prevTier, tierChanged: false, isComplete: false };
    }

    // End of tier
    if (currentTier === 'calibration') {
      setTimeout(() => {
        setCurrentTier('architecture');
        setCurrentQuestionIndex(0);
        setIsNavigating(false);
      }, 600);
      return { prevTier, newTier: 'architecture', tierChanged: true, isComplete: false };
    } else if (currentTier === 'architecture') {
      setTimeout(() => {
        setCurrentTier('context');
        setCurrentQuestionIndex(0);
        setIsNavigating(false);
      }, 600);
      return { prevTier, newTier: 'context', tierChanged: true, isComplete: false };
    } else {
      // Quiz complete
      setTimeout(() => {
        finishQuiz(newProfile);
      }, 600);
      return { prevTier, newTier: 'context', tierChanged: false, isComplete: true };
    }
  }, [isNavigating, profile, currentTier, currentQuestionIndex, finishQuiz]);

  return {
    currentQuestion,
    currentTier,
    progress,
    tierLabel,
    isNavigating,
    handleAnswer,
  };
}

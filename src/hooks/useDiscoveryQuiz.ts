import { useState, useCallback, useRef } from 'react';
import { questions as questionPool, type QuestionOption } from '@/lib/discovery-questions';
import { publishPalate, publishElicitation } from '@/lib/api-client';
import { saveProfile } from '@/lib/device-store';
import { toElicitationRecord } from '@/lib/elicitation';
import {
  type BeliefState,
  createInitialBelief,
  answerQuestion,
  isComplete as beliefIsComplete,
  getConfidenceProgress,
  beliefToProfile,
} from '@/lib/belief-state';
import { selectNextQuestion } from '@/lib/question-selector';

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

  const currentQuestion = (() => {
    if (currentQuestionId) {
      const poolQ = questionPool.find(q => q.id === currentQuestionId);
      if (poolQ) return poolQ;
    }
    return selectNextQuestion(belief, answeredIdsState);
  })();

  const progress = getConfidenceProgress(belief);

  const finishQuiz = useCallback((finalBelief: BeliefState) => {
    const finalProfile = beliefToProfile(finalBelief);
    saveProfile(finalProfile);

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

  const handleAnswer = useCallback((option: QuestionOption, _index: number): void => {
    if (isNavigating || !currentQuestion) return;
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

    answeredIdsRef.current.add(currentQuestion.id);
    setAnsweredIdsState(new Set(answeredIdsRef.current));

    const newBelief = answerQuestion(belief, currentQuestion, option);

    // Check if quiz is complete
    if (beliefIsComplete(newBelief)) {
      setBelief(newBelief);
      setTimeout(() => {
        finishQuiz(newBelief);
      }, ADVANCE_MS);
      return;
    }

    // Select next question synchronously
    const nextQuestion = selectNextQuestion(newBelief, answeredIdsRef.current);

    if (!nextQuestion) {
      setBelief(newBelief);
      setTimeout(() => {
        finishQuiz(newBelief);
      }, ADVANCE_MS);
      return;
    }

    setTimeout(() => {
      setBelief(newBelief);
      setCurrentQuestionId(nextQuestion.id);
      setIsNavigating(false);
    }, ADVANCE_MS);
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

  const resetQuiz = useCallback(() => {
    setBelief(createInitialBelief());
    answeredIdsRef.current = new Set();
    setAnsweredIdsState(new Set());
    setCurrentQuestionId(null);
    setIsNavigating(false);
    setHistory([]);
  }, []);

  return {
    currentQuestion,
    progress,
    isNavigating,
    belief,
    questionCount: belief.questionCount,
    canGoBack: history.length > 0,
    handleAnswer,
    handleBack,
    resetQuiz,
  };
}

'use client';
import { useRef, useCallback } from 'react';
import { ENRICHED_FEEDBACK } from '@/lib/conversation';
import type { BeliefState } from '@/lib/belief-state';
import type { Question } from '@/lib/discovery-questions';
import {
  buildQuestionPrompt,
  parseAIResponse,
  extractFeedbackFromText,
} from '@/lib/ai-question-generator';

export function useBartenderChat() {
  const resetChat = useCallback(() => {}, []);

  const getBartenderResponse = useCallback(async (
    questionText: string,
    answerText: string,
    questionId: string,
    optionIndex: number,
    _tierTransition?: { from: string; to: string },
  ): Promise<string> => {
    return ENRICHED_FEEDBACK[`${questionId}-${optionIndex}`] || 'Solid choice. That tells me a lot about what you enjoy.';
  }, []);

  const interpretFreeText = useCallback(async (
    _userText: string,
    _questionText: string,
    _optionTexts: string[],
  ): Promise<{ matchedIndex: number }> => {
    return { matchedIndex: -1 };
  }, []);

  const getOpenerResponse = useCallback(async (
    _userText: string,
  ): Promise<string> => {
    return "Interesting — I can already tell you've got taste. Let me ask you a few things to zero in on your flavor profile.";
  }, []);

  let aiQuestionCounter = 0;
  const getNextQuestionWithFeedback = useCallback(async (
    questionText: string,
    answerText: string,
    questionId: string,
    optionIndex: number,
    _beliefState: BeliefState,
    _tierTransition?: { from: string; to: string },
  ): Promise<{ feedback: string; question: Question | null }> => {
    const feedbackFallback = ENRICHED_FEEDBACK[`${questionId}-${optionIndex}`] || 'Good call.';
    return { feedback: feedbackFallback, question: null };
  }, []);

  return { getBartenderResponse, getNextQuestionWithFeedback, interpretFreeText, getOpenerResponse, resetChat };
}

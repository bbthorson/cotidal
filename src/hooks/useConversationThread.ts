'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import type { User } from '@/lib/data';
import type { QuestionOption } from '@/lib/discovery-questions';
import type { ThreadMessage } from '@/components/app/ChatThread';
import { useDiscoveryQuiz, type UserProfile } from './useDiscoveryQuiz';
import { useBartenderChat } from './useBartenderChat';

type Screen = 'chat' | 'results';

let msgCounter = 0;
function createMsg(role: ThreadMessage['role'], content: string, action?: string): ThreadMessage {
  return { id: `t-${++msgCounter}`, role, content, action };
}

function profileToUser(profile: UserProfile | null): User {
  if (!profile) return { x: 0, y: 0, filters: [] };
  const filters: string[] = [];
  if (profile.dislikesSmoke) filters.push('noSmoke');
  if (profile.dislikesBitter) filters.push('noBitter');
  if (profile.dislikesAnise) filters.push('noAnise');
  return { x: profile.x, y: profile.y, filters, dislikesAnise: profile.dislikesAnise };
}

const WELCOME_MSG = "What are you in the mood for tonight?";

function getInitialProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('user_profile');
    return saved ? JSON.parse(saved) as UserProfile : null;
  } catch {
    return null;
  }
}

export function useConversationThread() {
  const initialProfile = getInitialProfile();
  const [screen, setScreen] = useState<Screen>(initialProfile ? 'results' : 'chat');
  const [messages, setMessages] = useState<ThreadMessage[]>([
    createMsg('bartender', WELCOME_MSG),
  ]);
  const [pendingOptions, setPendingOptions] = useState<QuestionOption[] | null>(null);
  const [user, setUser] = useState<User>(() => profileToUser(initialProfile));
  const [vibeTags, setVibeTags] = useState<Record<string, number> | null>(initialProfile?.vibeTags ?? null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [awaitingOpener, setAwaitingOpener] = useState(true);

  const bartender = useBartenderChat();

  const handleQuizComplete = useCallback((profile: UserProfile) => {
    setUser(profileToUser(profile));
    setVibeTags(profile.vibeTags);
    setMessages(prev => [
      ...prev,
      createMsg('system', "I've got your menu. Take a look.", 'results'),
    ]);
    setPendingOptions(null);
  }, []);

  const quiz = useDiscoveryQuiz(handleQuizComplete);

  // Update a message's content by id (for async AI responses)
  const updateMessage = useCallback((id: string, content: string) => {
    setMessages(prev =>
      prev.map(msg => msg.id === id ? { ...msg, content } : msg)
    );
  }, []);

  // Start the quiz — show first question as bartender message with chips
  const startQuiz = useCallback(() => {
    setQuizStarted(true);
    setAwaitingOpener(false);
    if (quiz.currentQuestion) {
      setMessages(prev => [...prev, createMsg('bartender', quiz.currentQuestion!.text)]);
      setPendingOptions(quiz.currentQuestion.options);
    }
  }, [quiz.currentQuestion]);

  const handleAction = useCallback((action: string) => {
    if (action === 'results') {
      setScreen('results');
    }
  }, []);

  // Ref to track pending feedback message for async AI response
  const pendingFeedbackRef = useRef<{
    feedbackMsgId: string;
    questionText: string;
    answerText: string;
    questionId: string;
    optionIndex: number;
  } | null>(null);

  const handleSelectOption = useCallback((option: QuestionOption, index: number) => {
    if (quiz.isNavigating || !quiz.currentQuestion) return;

    const questionId = quiz.currentQuestion.id;
    const questionText = quiz.currentQuestion.text;

    // Add user message, clear chips
    setMessages(prev => [...prev, createMsg('user', option.text)]);
    setPendingOptions(null);

    // Process answer
    const result = quiz.handleAnswer(option, index);

    // Add bartender feedback placeholder
    const feedbackMsg = createMsg('bartender', '…');
    setMessages(prev => [...prev, feedbackMsg]);

    // Fire AI for feedback (just feedback, no next question)
    bartender.getUnifiedTurn(questionText, option.text, questionId, index, null,
      result.tierChanged ? { from: result.prevTier, to: result.newTier } : undefined
    ).then(text => updateMessage(feedbackMsg.id, text));

    // Store ref so the effect can add the next question message
    if (!result.isComplete) {
      pendingFeedbackRef.current = {
        feedbackMsgId: feedbackMsg.id,
        questionText,
        answerText: option.text,
        questionId,
        optionIndex: index,
      };
    }
  }, [quiz, bartender, updateMessage]);

  // Watch for navigation completing to show next question + chips
  // We track isNavigating going from true → false, which means the quiz
  // has settled on the next question (currentQuestionId is set).
  const wasNavigatingRef = useRef(false);
  useEffect(() => {
    if (!quizStarted) return;
    if (wasNavigatingRef.current && !quiz.isNavigating && quiz.currentQuestion) {
      // Navigation just completed — show next question and chips
      pendingFeedbackRef.current = null;
      setMessages(prev => [...prev, createMsg('bartender', quiz.currentQuestion!.text)]);
      setPendingOptions(quiz.currentQuestion!.options);
    }
    wasNavigatingRef.current = quiz.isNavigating;
  }, [quiz.isNavigating, quiz.currentQuestion, quizStarted]);

  // Handle freeform text input
  const handleSendText = useCallback(async (text: string) => {
    if (quiz.isNavigating) return;

    // Phase 3: Open-ended opener
    if (awaitingOpener) {
      setMessages(prev => [...prev, createMsg('user', text)]);

      const openerMsg = createMsg('bartender', '…');
      setMessages(prev => [...prev, openerMsg]);

      bartender.getOpenerResponse(text).then(response => {
        updateMessage(openerMsg.id, response);
        startQuiz();
      });
      return;
    }

    if (!pendingOptions) return;

    // Add user message immediately
    setMessages(prev => [...prev, createMsg('user', text)]);

    // Phase 3: AI interpretation of freeform text
    const optionTexts = pendingOptions.map(o => o.text);
    const questionText = quiz.currentQuestion?.text ?? '';

    const { matchedIndex } = await bartender.interpretFreeText(text, questionText, optionTexts);

    if (matchedIndex >= 0 && matchedIndex < pendingOptions.length) {
      const option = pendingOptions[matchedIndex];
      const questionId = quiz.currentQuestion?.id;
      if (!questionId || !quiz.currentQuestion) return;

      setPendingOptions(null);
      const result = quiz.handleAnswer(option, matchedIndex);

      // Feedback placeholder
      const feedbackMsg = createMsg('bartender', '…');
      setMessages(prev => [...prev, feedbackMsg]);

      bartender.getUnifiedTurn(questionText, text, questionId, matchedIndex, null,
        result.tierChanged ? { from: result.prevTier, to: result.newTier } : undefined
      ).then(t => updateMessage(feedbackMsg.id, t));

      if (!result.isComplete) {
        pendingFeedbackRef.current = {
          feedbackMsgId: feedbackMsg.id,
          questionText,
          answerText: text,
          questionId,
          optionIndex: matchedIndex,
        };
      }
    } else {
      // No match — bartender nudge, keep chips
      setMessages(prev => [
        ...prev,
        createMsg('bartender', "I hear you, but I need you to pick one of these to keep things moving. Which one speaks to you?"),
      ]);
    }
  }, [awaitingOpener, pendingOptions, quiz, bartender, updateMessage, startQuiz]);

  const reset = useCallback(() => {
    localStorage.removeItem('user_profile');
    quiz.resetQuiz();
    bartender.resetChat();
    msgCounter = 0;
    setMessages([
      createMsg('bartender', WELCOME_MSG),
    ]);
    setPendingOptions(null);
    setUser({ x: 0, y: 0, filters: [] });
    setVibeTags(null);
    setQuizStarted(false);
    setAwaitingOpener(true);
    setScreen('chat');
  }, [quiz, bartender]);

  return {
    screen,
    messages,
    pendingOptions,
    isNavigating: quiz.isNavigating,
    progress: quiz.progress,
    user,
    vibeTags,
    handleSelectOption,
    handleSendText,
    handleAction,
    reset,
    setScreen,
  };
}

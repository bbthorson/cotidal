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

  // Start the quiz — show first question with chips
  const startQuiz = useCallback(() => {
    setQuizStarted(true);
    setAwaitingOpener(false);
    if (quiz.currentQuestion) {
      setPendingOptions(quiz.currentQuestion.options);
    }
  }, [quiz.currentQuestion]);

  const handleAction = useCallback((action: string) => {
    if (action === 'results') {
      setScreen('results');
    }
  }, []);

  const handleSelectOption = useCallback((option: QuestionOption, index: number) => {
    if (quiz.isNavigating || !quiz.currentQuestion) return;

    const questionId = quiz.currentQuestion.id;
    const questionText = quiz.currentQuestion.text;

    // Add user message, clear chips
    setMessages(prev => [...prev, createMsg('user', option.text)]);
    setPendingOptions(null);

    // Process answer — get result before firing AI
    const result = quiz.handleAnswer(option, index);

    // Add bartender placeholder for unified turn
    const bartenderMsg = createMsg('bartender', '…');
    setMessages(prev => [...prev, bartenderMsg]);

    // Determine next question text for the unified turn
    // We need to peek at what the next question will be after the state updates
    // The quiz hook sets currentQuestionId after 600ms, so we can't read it yet
    // Instead, we pass the info to the AI and show chips when the question arrives

    // Fire unified AI turn
    const tierTransition = result.tierChanged
      ? { from: result.prevTier, to: result.newTier }
      : undefined;

    // We'll get the next question text from the effect when quiz.currentQuestion changes
    // For now, fire with null — the effect will handle showing chips
    if (result.isComplete) {
      bartender.getUnifiedTurn(questionText, option.text, questionId, index, null, tierTransition)
        .then(text => updateMessage(bartenderMsg.id, text));
    } else {
      // Store the bartender message id so the effect can update it with the next question
      pendingUnifiedRef.current = {
        bartenderMsgId: bartenderMsg.id,
        questionText,
        answerText: option.text,
        questionId,
        optionIndex: index,
        tierTransition,
      };
    }
  }, [quiz, bartender, updateMessage]);

  // Ref to track pending unified turn that needs the next question
  const pendingUnifiedRef = useRef<{
    bartenderMsgId: string;
    questionText: string;
    answerText: string;
    questionId: string;
    optionIndex: number;
    tierTransition?: { from: string; to: string };
  } | null>(null);

  // Watch for quiz question changes to fire unified turn and show chips
  const prevQuestionRef = useRef<string | null>(null);
  useEffect(() => {
    if (!quizStarted) return;
    const qId = quiz.currentQuestion?.id ?? null;
    if (qId && qId !== prevQuestionRef.current && prevQuestionRef.current !== null) {
      // Question changed — fire unified turn with next question text
      const pending = pendingUnifiedRef.current;
      if (pending) {
        const nextQText = quiz.currentQuestion!.text;
        bartender.getUnifiedTurn(
          pending.questionText,
          pending.answerText,
          pending.questionId,
          pending.optionIndex,
          nextQText,
          pending.tierTransition,
        ).then(text => updateMessage(pending.bartenderMsgId, text));
        pendingUnifiedRef.current = null;
      }

      // Show chips for the new question
      setPendingOptions(quiz.currentQuestion!.options);
    }
    prevQuestionRef.current = qId;
  }, [quiz.currentQuestion, quizStarted, bartender, updateMessage]);

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
        // Start the quiz after opener response
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
      // Matched — treat as if they tapped that chip
      // Remove the user message we just added (handleSelectOption will add it again)
      // Actually, we already added the user message with freeform text — that's fine,
      // but handleSelectOption adds another. Let's call the quiz directly instead.
      const option = pendingOptions[matchedIndex];
      const questionId = quiz.currentQuestion?.id;
      if (!questionId || !quiz.currentQuestion) return;

      setPendingOptions(null);
      const result = quiz.handleAnswer(option, matchedIndex);

      const bartenderMsg = createMsg('bartender', '…');
      setMessages(prev => [...prev, bartenderMsg]);

      const tierTransition = result.tierChanged
        ? { from: result.prevTier, to: result.newTier }
        : undefined;

      if (result.isComplete) {
        bartender.getUnifiedTurn(questionText, text, questionId, matchedIndex, null, tierTransition)
          .then(t => updateMessage(bartenderMsg.id, t));
      } else {
        pendingUnifiedRef.current = {
          bartenderMsgId: bartenderMsg.id,
          questionText,
          answerText: text,
          questionId,
          optionIndex: matchedIndex,
          tierTransition,
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

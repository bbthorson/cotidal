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

const WELCOME_MSG = "A few quick questions about what you like, and I'll map out your flavor profile across cocktails, wines, and spirits. Think of it as a cheat sheet for your next drink order.";

export function useConversationThread() {
  const [screen, setScreen] = useState<Screen>('chat');
  const [messages, setMessages] = useState<ThreadMessage[]>([
    createMsg('bartender', WELCOME_MSG),
    createMsg('system', 'Begin', 'begin'),
  ]);
  const [pendingOptions, setPendingOptions] = useState<QuestionOption[] | null>(null);
  const [user, setUser] = useState<User>({ x: 0, y: 0, filters: [] });
  const [vibeTags, setVibeTags] = useState<Record<string, number> | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);

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

  // When quiz starts or advances, show the current question
  const showQuestion = useCallback((questionText: string, options: QuestionOption[]) => {
    setMessages(prev => [...prev, createMsg('bartender', questionText)]);
    setPendingOptions(options);
  }, []);

  // Update a message's content by id (for async AI responses)
  const updateMessage = useCallback((id: string, content: string) => {
    setMessages(prev =>
      prev.map(msg => msg.id === id ? { ...msg, content } : msg)
    );
  }, []);

  const handleAction = useCallback((action: string) => {
    if (action === 'begin') {
      setQuizStarted(true);
      // Remove the Begin action message
      setMessages(prev => prev.filter(m => m.action !== 'begin'));
      // Show first question
      if (quiz.currentQuestion) {
        showQuestion(quiz.currentQuestion.text, quiz.currentQuestion.options);
      }
    } else if (action === 'results') {
      setScreen('results');
    }
  }, [quiz.currentQuestion, showQuestion]);

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

    // Fire AI for feedback
    bartender.getBartenderResponse(questionText, option.text, questionId, index)
      .then(text => updateMessage(feedbackMsg.id, text));

    // Tier transition
    if (result.tierChanged) {
      const transMsg = createMsg('system', '…');
      setMessages(prev => [...prev, transMsg]);
      bartender.getTierTransition(result.prevTier, result.newTier)
        .then(text => updateMessage(transMsg.id, text));
    }

    // Show next question after navigation delay (quiz manages the 600ms timeout)
    if (!result.isComplete) {
      setTimeout(() => {
        // Re-read currentQuestion after state updates from quiz
        // We need to read it from the quiz hook after it updates
      }, 650);
    }
  }, [quiz, bartender, updateMessage]);

  // Watch for quiz question changes to show next question
  const prevQuestionRef = useRef<string | null>(null);
  useEffect(() => {
    if (!quizStarted) return;
    const qId = quiz.currentQuestion?.id ?? null;
    if (qId && qId !== prevQuestionRef.current && prevQuestionRef.current !== null) {
      // Question changed — show the new one
      showQuestion(quiz.currentQuestion!.text, quiz.currentQuestion!.options);
    }
    prevQuestionRef.current = qId;
  }, [quiz.currentQuestion, quizStarted, showQuestion]);

  const handleSendText = useCallback((text: string) => {
    if (!pendingOptions || quiz.isNavigating) return;

    // Fuzzy match against current options
    const lower = text.toLowerCase();
    const matchIdx = pendingOptions.findIndex(opt =>
      opt.text.toLowerCase().includes(lower) || lower.includes(opt.text.toLowerCase())
    );

    if (matchIdx >= 0) {
      handleSelectOption(pendingOptions[matchIdx], matchIdx);
    } else {
      // No match — add user text and bartender nudge
      setMessages(prev => [
        ...prev,
        createMsg('user', text),
        createMsg('bartender', "Hmm, I've got some specific options in mind — try one of those for now."),
      ]);
    }
  }, [pendingOptions, quiz.isNavigating, handleSelectOption]);

  const reset = useCallback(() => {
    localStorage.removeItem('user_profile');
    quiz.resetQuiz();
    bartender.resetChat();
    msgCounter = 0;
    setMessages([
      createMsg('bartender', WELCOME_MSG),
      createMsg('system', 'Begin', 'begin'),
    ]);
    setPendingOptions(null);
    setUser({ x: 0, y: 0, filters: [] });
    setVibeTags(null);
    setQuizStarted(false);
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

'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import type { User } from '@/lib/data';
import type { QuestionOption } from '@/lib/discovery-questions';
import type { ThreadMessage } from '@/components/app/ChatThread';
import { useDiscoveryQuiz, type UserProfile } from './useDiscoveryQuiz';
import { useBartenderChat } from './useBartenderChat';
import { useAtprotoContext } from '@/components/app/AtprotoProvider';
import { getConnectedPalate, publishPalate } from '@/app/actions/atproto-publish';

type Screen = 'chat' | 'results' | 'marketing';

// Ensure async responses take at least minMs so typing indicator feels natural
async function withMinDelay<T>(promise: Promise<T>, minMs = 500): Promise<T> {
  const [result] = await Promise.all([promise, new Promise(r => setTimeout(r, minMs))]);
  return result;
}

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
  const [screen, setScreen] = useState<Screen>(initialProfile ? 'results' : 'marketing');
  const [messages, setMessages] = useState<ThreadMessage[]>([
    createMsg('bartender', WELCOME_MSG),
  ]);
  const [pendingOptions, setPendingOptions] = useState<QuestionOption[] | null>(null);
  const [user, setUser] = useState<User>(() => profileToUser(initialProfile));
  const [vibeTags, setVibeTags] = useState<Record<string, number> | null>(initialProfile?.vibeTags ?? null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [awaitingOpener, setAwaitingOpener] = useState(true);

  const bartender = useBartenderChat();
  const { isConnected } = useAtprotoContext();

  useEffect(() => {
    if (isConnected) {
      getConnectedPalate().then(async (profile) => {
        if (profile) {
          setUser(profileToUser(profile));
          setVibeTags(profile.vibeTags);
          localStorage.setItem('user_profile', JSON.stringify(profile));
          setScreen('results');
          setMessages(prev => {
            if (prev.some(msg => msg.content.includes("Logged in with Bluesky profile"))) return prev;
            return [
              ...prev,
              createMsg('system', "Logged in with Bluesky profile. Loaded taste preferences.")
            ];
          });
        } else {
          // Connected, but no profile on repo yet. Check if we have a local guest profile.
          const guestProfile = getInitialProfile();
          if (guestProfile) {
            // Auto-publish local profile to repo
            await publishPalate(guestProfile);
            setUser(profileToUser(guestProfile));
            setVibeTags(guestProfile.vibeTags);
            setScreen('results');
            setMessages(prev => [
              ...prev,
              createMsg('system', "Connected! Your local palate profile has been saved to your repository.")
            ]);
          } else {
            // No profile anywhere -> trigger onboarding quiz
            setScreen('chat');
          }
        }
      }).catch(err => {
        console.error("Failed to load palate from AT Protocol:", err);
      });
    }
  }, [isConnected]);

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

  const handleSelectOption = useCallback((option: QuestionOption, index: number) => {
    if (quiz.isNavigating || !quiz.currentQuestion) return;

    const questionId = quiz.currentQuestion.id;
    const questionText = quiz.currentQuestion.text;

    // Add user message, clear chips
    setMessages(prev => [...prev, createMsg('user', option.text)]);
    setPendingOptions(null);

    // Process answer
    const result = quiz.handleAnswer(option, index);

    if (result.isComplete) {
      // Quiz done — just show feedback
      const feedbackMsg = createMsg('bartender', '…');
      setMessages(prev => [...prev, feedbackMsg]);
      withMinDelay(bartender.getBartenderResponse(questionText, option.text, questionId, index,
        result.tierChanged ? { from: result.prevTier, to: result.newTier } : undefined
      )).then(text => updateMessage(feedbackMsg.id, text));
      return;
    }

    if (result.needsAIQuestion) {
      // Post-calibration: unified AI call for feedback + next question
      const feedbackMsg = createMsg('bartender', '…');
      setMessages(prev => [...prev, feedbackMsg]);

      withMinDelay(bartender.getNextQuestionWithFeedback(
        questionText, option.text, questionId, index,
        result.beliefState,
        result.tierChanged ? { from: result.prevTier, to: result.newTier } : undefined
      )).then(({ feedback, question }) => {
        updateMessage(feedbackMsg.id, feedback);

        // After feedback settles, show the next question
        setTimeout(() => {
          if (question) {
            quiz.setAIQuestion(question);
            setMessages(prev => [...prev, createMsg('bartender', question.text)]);
            // Stagger chips after question text
            setTimeout(() => setPendingOptions(question.options), 400);
          } else {
            // AI failed — fallback to hardcoded pool
            quiz.setFallbackQuestion();
          }
        }, 1400);
      });
      return;
    }

    // Calibration phase: feedback only, question comes from navigation effect
    const feedbackMsg = createMsg('bartender', '…');
    setMessages(prev => [...prev, feedbackMsg]);

    withMinDelay(bartender.getBartenderResponse(questionText, option.text, questionId, index,
      result.tierChanged ? { from: result.prevTier, to: result.newTier } : undefined
    )).then(text => updateMessage(feedbackMsg.id, text));
  }, [quiz, bartender, updateMessage]);

  // Watch for navigation completing to show next question + chips (calibration only)
  const wasNavigatingRef = useRef(false);
  useEffect(() => {
    if (!quizStarted) return;
    if (wasNavigatingRef.current && !quiz.isNavigating && quiz.currentQuestion) {
      // Navigation just completed — show next question and chips
      // Only for calibration/fallback questions (AI questions are handled inline)
      if (!quiz.currentQuestion.isAIGenerated) {
        const questionText = quiz.currentQuestion.text;
        const questionOptions = quiz.currentQuestion.options;
        setTimeout(() => {
          setMessages(prev => [...prev, createMsg('bartender', questionText)]);
          setTimeout(() => setPendingOptions(questionOptions), 400);
        }, 0);
      }
    }
    wasNavigatingRef.current = quiz.isNavigating;
  }, [quiz.isNavigating, quiz.currentQuestion, quizStarted]);

  // Handle freeform text input
  const handleSendText = useCallback(async (text: string) => {
    if (quiz.isNavigating) return;

    // Open-ended opener
    if (awaitingOpener) {
      setMessages(prev => [...prev, createMsg('user', text)]);

      const openerMsg = createMsg('bartender', '…');
      setMessages(prev => [...prev, openerMsg]);

      withMinDelay(bartender.getOpenerResponse(text)).then(response => {
        updateMessage(openerMsg.id, response);
        // Brief pause before first question appears
        setTimeout(() => startQuiz(), 800);
      });
      return;
    }

    if (!pendingOptions) return;

    // Add user message immediately
    setMessages(prev => [...prev, createMsg('user', text)]);

    // AI interpretation of freeform text
    const optionTexts = pendingOptions.map(o => o.text);
    const questionText = quiz.currentQuestion?.text ?? '';

    const { matchedIndex } = await bartender.interpretFreeText(text, questionText, optionTexts);

    if (matchedIndex >= 0 && matchedIndex < pendingOptions.length) {
      const option = pendingOptions[matchedIndex];
      const questionId = quiz.currentQuestion?.id;
      if (!questionId || !quiz.currentQuestion) return;

      setPendingOptions(null);
      const result = quiz.handleAnswer(option, matchedIndex);

      if (result.needsAIQuestion) {
        // Post-calibration: unified call
        const feedbackMsg = createMsg('bartender', '…');
        setMessages(prev => [...prev, feedbackMsg]);

        bartender.getNextQuestionWithFeedback(
          questionText, text, questionId, matchedIndex,
          result.beliefState,
          result.tierChanged ? { from: result.prevTier, to: result.newTier } : undefined
        ).then(({ feedback, question }) => {
          updateMessage(feedbackMsg.id, feedback);

          setTimeout(() => {
            if (question) {
              quiz.setAIQuestion(question);
              setMessages(prev => [...prev, createMsg('bartender', question.text)]);
              setTimeout(() => setPendingOptions(question.options), 400);
            } else {
              quiz.setFallbackQuestion();
            }
          }, 1400);
        });
      } else {
        // Calibration phase
        const feedbackMsg = createMsg('bartender', '…');
        setMessages(prev => [...prev, feedbackMsg]);

        bartender.getBartenderResponse(questionText, text, questionId, matchedIndex,
          result.tierChanged ? { from: result.prevTier, to: result.newTier } : undefined
        ).then((t: string) => updateMessage(feedbackMsg.id, t));
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

  const handlePalateUpdated = useCallback((profile: UserProfile) => {
    setUser(profileToUser(profile));
    setVibeTags(profile.vibeTags);
    localStorage.setItem('user_profile', JSON.stringify(profile));
  }, []);

  return {
    screen,
    messages,
    pendingOptions,
    isNavigating: quiz.isNavigating,
    progress: quiz.progress,
    quizStarted,
    awaitingOpener,
    user,
    vibeTags,
    handleSelectOption,
    handleSendText,
    handleAction,
    handlePalateUpdated,
    reset,
    setScreen,
  };
}

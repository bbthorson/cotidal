'use client';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { User } from '@/lib/data';
import type { QuestionOption } from '@/lib/data';
import { auth } from '@/lib/firebase';
import { getUserProfile } from '@/lib/profile-service';
import { onAuthStateChanged } from 'firebase/auth';
import { Loader2, ArrowRight } from 'lucide-react';
import { ChatLayout } from '@/components/app/ChatLayout';
import { ChatHeader } from '@/components/app/ChatHeader';
import { ConversationThread } from '@/components/app/ConversationThread';
import { AnswerChoices } from '@/components/app/AnswerChoices';
import { Button } from '@/components/ui/button';
import { useDiscoveryQuiz, type UserProfile } from '@/hooks/useDiscoveryQuiz';
import { useBartenderChat } from '@/hooks/useBartenderChat';
import {
  type ConversationMessage,
  createMessage,
} from '@/lib/conversation';

// Lazy load heavy results components
const ResultsScreen = dynamic(() => import('@/components/app/ResultsScreen').then(mod => mod.ResultsScreen), {
  loading: () => <div className="flex min-h-[300px] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary/50" /></div>,
  ssr: false,
});

function getInitialProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  const savedProfile = localStorage.getItem('user_profile');
  if (savedProfile) {
    try {
      return JSON.parse(savedProfile) as UserProfile;
    } catch {
      return null;
    }
  }
  return null;
}

function profileToUser(profile: UserProfile | null): User {
  if (!profile) return { x: 0, y: 0, filters: [] };
  const filters: string[] = [];
  if (profile.dislikesSmoke) filters.push('noSmoke');
  if (profile.dislikesBitter) filters.push('noBitter');
  if (profile.dislikesAnise) filters.push('noAnise');
  return { x: profile.x, y: profile.y, filters, dislikesAnise: profile.dislikesAnise };
}

export default function Home() {
  const initialProfile = useMemo(() => getInitialProfile(), []);
  const [screen, setScreen] = useState<'welcome' | 'quiz' | 'results'>(
    initialProfile ? 'results' : 'welcome'
  );
  const [user, setUser] = useState<User>(() => profileToUser(initialProfile));
  const [vibeTags, setVibeTags] = useState<Record<string, number> | null>(initialProfile?.vibeTags ?? null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const middleRef = useRef<HTMLDivElement>(null);
  const bartender = useBartenderChat();

  const applyProfile = useCallback((profile: UserProfile) => {
    setUser(profileToUser(profile));
    setVibeTags(profile.vibeTags);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const cloudProfile = await getUserProfile(firebaseUser.uid);
        if (cloudProfile) {
          applyProfile(cloudProfile);
          setScreen('results');
        }
      }
    });
    return () => unsubscribe();
  }, [applyProfile]);

  const handleQuizComplete = useCallback((profile: UserProfile) => {
    applyProfile(profile);
    setConversationHistory(prev => [
      ...prev,
      createMessage('system', "I've got your menu. Take a look."),
    ]);
    setScreen('results');
  }, [applyProfile]);

  const quiz = useDiscoveryQuiz(handleQuizComplete);

  // Update a specific message's content by id
  const updateMessage = useCallback((id: string, content: string) => {
    setConversationHistory(prev =>
      prev.map(msg => msg.id === id ? { ...msg, content } : msg)
    );
  }, []);

  const handleQuizAnswer = useCallback((option: QuestionOption, index: number) => {
    if (!quiz.currentQuestion) return;
    const questionId = quiz.currentQuestion.id;
    const questionText = quiz.currentQuestion.text;
    const result = quiz.handleAnswer(option, index);

    // Add user message + placeholder bartender message immediately
    const userMsg = createMessage('user', option.text);
    const bartenderMsg = createMessage('bartender', '…');

    if (result.tierChanged) {
      const systemMsg = createMessage('system', '…');
      setConversationHistory(prev => [...prev, userMsg, bartenderMsg, systemMsg]);

      // Fire AI requests in parallel
      bartender.getBartenderResponse(questionText, option.text, questionId, index)
        .then(text => updateMessage(bartenderMsg.id, text));
      bartender.getTierTransition(result.prevTier, result.newTier)
        .then(text => updateMessage(systemMsg.id, text));
    } else {
      setConversationHistory(prev => [...prev, userMsg, bartenderMsg]);

      bartender.getBartenderResponse(questionText, option.text, questionId, index)
        .then(text => updateMessage(bartenderMsg.id, text));
    }
  }, [quiz, bartender, updateMessage]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const el = middleRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (isNearBottom) {
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      });
    }
  }, [conversationHistory]);

  // Scroll to top when switching to results
  useEffect(() => {
    if (screen === 'results') {
      middleRef.current?.scrollTo({ top: 0 });
    }
  }, [screen]);

  const finalUser = useMemo(() => {
    if (screen === 'results') {
      return {
        ...user,
        x: Math.max(-10, Math.min(10, user.x)),
        y: Math.max(-10, Math.min(10, user.y)),
      };
    }
    return user;
  }, [user, screen]);

  const handleStartQuiz = () => {
    setUser({ x: 0, y: 0, filters: [] });
    setVibeTags(null);
    setConversationHistory([]);
    bartender.resetChat();
    quiz.resetQuiz();
    setScreen('quiz');
  };

  const handleReset = () => {
    localStorage.removeItem('user_profile');
    setConversationHistory([]);
    bartender.resetChat();
    setScreen('welcome');
  };

  // --- Zone content by screen ---

  let middleContent: React.ReactNode;
  let promptContent: React.ReactNode;
  let inputContent: React.ReactNode;

  if (screen === 'welcome') {
    middleContent = (
      <div className="flex items-center justify-center h-full">
        <p className="text-center text-lg text-foreground/80 leading-relaxed max-w-prose">
          A few quick questions about what you like, and we&apos;ll map out your flavor profile across cocktails, wines, and spirits. Think of it as a cheat sheet for your next drink order.
        </p>
      </div>
    );
    promptContent = (
      <p className="font-headline text-2xl md:text-3xl text-primary italic font-serif">
        Find your perfect drink.
      </p>
    );
    inputContent = (
      <Button onClick={handleStartQuiz} variant="editorial" size="lg" className="text-base gap-3 w-full justify-center">
        Begin
        <ArrowRight className="w-4 h-4" />
      </Button>
    );
  } else if (screen === 'quiz') {
    middleContent = <ConversationThread messages={conversationHistory} />;
    if (quiz.currentQuestion) {
      promptContent = (
        <div className="space-y-2">
          <p className="font-condensed text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {quiz.tierLabel}
          </p>
          <h2 className="font-headline text-2xl md:text-3xl text-primary leading-tight">
            {quiz.currentQuestion.text}
          </h2>
          {/* Progress bar */}
          <div className="w-full h-0.5 bg-primary/10 rounded-full overflow-hidden" role="progressbar" aria-label="Quiz progress" aria-valuenow={quiz.progress}>
            <div className="h-full bg-primary transition-all duration-300 ease-out" style={{ width: `${quiz.progress}%` }} />
          </div>
        </div>
      );
      inputContent = (
        <AnswerChoices
          options={quiz.currentQuestion.options}
          onAnswer={handleQuizAnswer}
          isNavigating={quiz.isNavigating}
        />
      );
    } else {
      promptContent = (
        <p className="font-headline text-2xl md:text-3xl text-primary italic font-serif">
          Mixing your menu&hellip;
        </p>
      );
      inputContent = null;
    }
  } else {
    middleContent = vibeTags ? (
      <ResultsScreen user={finalUser} vibeTags={vibeTags} />
    ) : (
      <div className="flex min-h-[300px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
      </div>
    );
    promptContent = (
      <h1 className="font-headline text-2xl md:text-3xl text-primary font-bold">
        Your Drink Menu
      </h1>
    );
    inputContent = (
      <button
        onClick={handleReset}
        className="font-condensed text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary underline underline-offset-4 decoration-primary/30 hover:decoration-primary/60 transition-colors min-h-[44px] px-4 w-full text-center"
      >
        Start Over
      </button>
    );
  }

  return (
    <ChatLayout
      header={<ChatHeader />}
      middle={middleContent}
      prompt={promptContent}
      input={inputContent}
      middleRef={middleRef}
      centerPrompt={screen !== 'results'}
    />
  );
}

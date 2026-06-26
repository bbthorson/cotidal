'use client';
import { useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { auth } from '@/lib/firebase';
import { getUserProfile } from '@/lib/profile-service';
import { onAuthStateChanged } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { ChatLayout } from '@/components/app/ChatLayout';
import { ChatHeader } from '@/components/app/ChatHeader';
import { ChatThread } from '@/components/app/ChatThread';
import { ChatInput } from '@/components/app/ChatInput';
import { useConversationThread } from '@/hooks/useConversationThread';
import { MarketingSite } from '@/components/app/MarketingSite';

// Lazy load heavy results components
const ResultsScreen = dynamic(() => import('@/components/app/ResultsScreen').then(mod => mod.ResultsScreen), {
  loading: () => <div className="flex min-h-[300px] w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary/50" /></div>,
  ssr: false,
});

export default function Home() {
  const thread = useConversationThread();
  const threadRef = useRef<HTMLDivElement>(null);

  // Load cloud profile on auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const cloudProfile = await getUserProfile(firebaseUser.uid);
        if (cloudProfile) {
          thread.setScreen('results');
        }
      }
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finalUser = useMemo(() => {
    if (thread.screen === 'results') {
      return {
        ...thread.user,
        x: Math.max(-10, Math.min(10, thread.user.x)),
        y: Math.max(-10, Math.min(10, thread.user.y)),
      };
    }
    return thread.user;
  }, [thread.user, thread.screen]);

  // --- Render by screen ---

  if (thread.screen === 'marketing') {
    return (
      <MarketingSite
        onStartQuiz={() => {
          thread.setScreen('chat');
        }}
        onExploreAsGuest={() => {
          thread.setScreen('results');
        }}
        hasLocalProfile={!!thread.vibeTags}
      />
    );
  }

  if (thread.screen === 'results') {
    return (
      <ChatLayout
        header={<ChatHeader />}
        middle={
          <div className="flex-1 overflow-y-auto">
            <ResultsScreen
              user={finalUser}
              vibeTags={thread.vibeTags || {}}
              onPalateUpdated={thread.handlePalateUpdated}
            />
          </div>
        }
        input={
          <button
            onClick={thread.reset}
            className="font-condensed text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary underline underline-offset-4 decoration-primary/30 hover:decoration-primary/60 transition-colors min-h-[44px] px-4 w-full text-center"
          >
            Start Over
          </button>
        }
      />
    );
  }

  const placeholder = thread.awaitingOpener
    ? "Tell me what you're in the mood for…"
    : "Type your answer…";

  return (
    <ChatLayout
      header={<ChatHeader progress={thread.quizStarted ? thread.progress : undefined} />}
      middle={
        <ChatThread
          messages={thread.messages}
          pendingOptions={thread.pendingOptions}
          onSelectOption={thread.handleSelectOption}
          onAction={thread.handleAction}
          isNavigating={thread.isNavigating}
          threadRef={threadRef}
        />
      }
      input={
        <ChatInput
          onSend={thread.handleSendText}
          disabled={thread.isNavigating}
          placeholder={placeholder}
        />
      }
    />
  );
}

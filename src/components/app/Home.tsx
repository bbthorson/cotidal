import { useState, useMemo, useCallback, useEffect } from 'react';
import { ResultsScreen } from '@/components/app/ResultsScreen';
import { Questionnaire } from '@/components/app/Questionnaire';
import { AtprotoProvider, useAtprotoContext } from '@/components/app/AtprotoProvider';
import { useDiscoveryQuiz, type UserProfile } from '@/hooks/useDiscoveryQuiz';
import { getConnectedPalate, publishPalate } from '@/lib/api-client';
import type { User } from '@/lib/data';

function profileToUser(profile: UserProfile | null): User {
  if (!profile) return { x: 0, y: 0, filters: [] };
  const filters: string[] = [];
  if (profile.dislikesSmoke) filters.push('noSmoke');
  if (profile.dislikesBitter) filters.push('noBitter');
  if (profile.dislikesAnise) filters.push('noAnise');
  return {
    x: Math.max(-10, Math.min(10, profile.x)),
    y: Math.max(-10, Math.min(10, profile.y)),
    filters,
    dislikesAnise: profile.dislikesAnise,
  };
}

function getInitialProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('user_profile');
    return saved ? (JSON.parse(saved) as UserProfile) : null;
  } catch {
    return null;
  }
}

function wantsBrowse(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('browse') === '1';
}

function HomeContent() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(getInitialProfile);
  const [screen, setScreen] = useState<'questionnaire' | 'results'>(() => {
    if (typeof window === 'undefined') return 'questionnaire';
    return getInitialProfile() || wantsBrowse() ? 'results' : 'questionnaire';
  });

  const { isConnected } = useAtprotoContext();

  useEffect(() => {
    if (isConnected) {
      getConnectedPalate()
        .then(async (profile) => {
          if (profile) {
            setUserProfile(profile);
            localStorage.setItem('user_profile', JSON.stringify(profile));
            setScreen('results');
          } else {
            const guest = getInitialProfile();
            if (guest) {
              await publishPalate(guest);
              setUserProfile(guest);
              setScreen('results');
            }
          }
        })
        .catch((err) => {
          console.error('Failed to load palate from AT Protocol:', err);
        });
    }
  }, [isConnected]);

  const handleQuizComplete = useCallback((profile: UserProfile) => {
    setUserProfile(profile);
    setScreen('results');
  }, []);

  const quiz = useDiscoveryQuiz(handleQuizComplete);

  const handlePalateUpdated = useCallback((profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem('user_profile', JSON.stringify(profile));
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem('user_profile');
    quiz.resetQuiz();
    setUserProfile(null);
    setScreen('questionnaire');
  }, [quiz]);

  const finalUser = useMemo(() => profileToUser(userProfile), [userProfile]);

  if (screen === 'results') {
    return (
      <div className="pt-4">
        <ResultsScreen
          user={finalUser}
          vibeTags={userProfile?.vibeTags || {}}
          onPalateUpdated={handlePalateUpdated}
        />
        <div className="mt-12 text-center border-t border-border pt-6 pb-12">
          <button
            onClick={reset}
            className="font-condensed text-xs uppercase tracking-label text-muted-foreground hover:text-primary underline underline-offset-4 decoration-primary/30 hover:decoration-primary/60 transition-colors min-h-[44px] px-4"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <Questionnaire
      currentQuestion={quiz.currentQuestion}
      progress={quiz.progress}
      questionCount={quiz.questionCount}
      isNavigating={quiz.isNavigating}
      canGoBack={quiz.canGoBack}
      onSelectOption={quiz.handleAnswer}
      onBack={quiz.handleBack}
      onExploreAsGuest={() => setScreen('results')}
    />
  );
}

export default function Home() {
  return (
    <AtprotoProvider>
      <HomeContent />
    </AtprotoProvider>
  );
}

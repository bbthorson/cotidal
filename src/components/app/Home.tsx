import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ResultsScreen } from '@/components/app/ResultsScreen';
import { Questionnaire } from '@/components/app/Questionnaire';
import { Reveal } from '@/components/app/Reveal';
import { SignInSheet } from '@/components/app/SignInSheet';
import { AtprotoProvider, useAtprotoContext } from '@/components/app/AtprotoProvider';
import { useDiscoveryQuiz, type UserProfile } from '@/hooks/useDiscoveryQuiz';
import { flushPendingElicitation, getConnectedPalate, publishPalate } from '@/lib/api-client';
import type { User } from '@/lib/data';
import { SIGNED_OUT_PARAM, START_OVER_PARAM } from '@/lib/atproto/paths';
import type { Register } from '@/lib/register';

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

/** What this device keeps of a palate. */
const DEVICE_KEYS = ['user_profile', 'pending_elicitation'];

/**
 * Take a one-off instruction from the URL and remove it, so a reload does not
 * repeat it. `true` when it was there.
 */
function takeParam(name: string): boolean {
  if (typeof window === 'undefined') return false;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(name)) return false;
  url.searchParams.delete(name);
  window.history.replaceState({}, '', url.pathname + url.search);
  return true;
}

/**
 * After a sign-out (the header's form lands here marked), forget this
 * device's copy of the palate: on a shared device the next person should not
 * find someone else's coordinate. It is still on their account.
 */
function forgetDeviceAfterSignOut(): void {
  if (!takeParam(SIGNED_OUT_PARAM)) return;
  try {
    DEVICE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage unavailable: nothing was kept.
  }
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

/**
 * The first visit is three beats (Flow Recommendations): the questions, the
 * reveal, then the menu. A returning visitor goes straight to the menu.
 */
type Screen = 'questionnaire' | 'reveal' | 'results';

function HomeContent({ register }: { register: Register }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    // Before anything reads the device's palate.
    forgetDeviceAfterSignOut();
    return getInitialProfile();
  });
  const [screen, setScreen] = useState<Screen>(() => {
    if (typeof window === 'undefined') return 'questionnaire';
    return getInitialProfile() || wantsBrowse() ? 'results' : 'questionnaire';
  });
  const [signInOpen, setSignInOpen] = useState(false);

  const { isConnected } = useAtprotoContext();
  /**
   * Set while someone is retaking the questions, until they finish. The
   * palate on their account is the one being replaced, so it must not be
   * restored over the questionnaire in the meantime.
   */
  const startingOver = useRef(false);

  useEffect(() => {
    if (isConnected) {
      // Answers from a quiz finished before signing in.
      void flushPendingElicitation();
      getConnectedPalate()
        .then(async (profile) => {
          if (startingOver.current) return;
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

  // The header's "Sign in" on this route links to ?signin=1 (site-nav.ts),
  // which opens the sheet rather than leaving for the landing page's form.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('signin') !== '1') return;
    url.searchParams.delete('signin');
    window.history.replaceState({}, '', url.pathname + url.search);
    setSignInOpen(true);
  }, []);

  // Each beat starts at the top of the page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  const handleQuizComplete = useCallback((profile: UserProfile) => {
    // The quiz has published the new palate (useDiscoveryQuiz).
    startingOver.current = false;
    setUserProfile(profile);
    setScreen('reveal');
  }, []);

  const quiz = useDiscoveryQuiz(handleQuizComplete);

  const handlePalateUpdated = useCallback((profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem('user_profile', JSON.stringify(profile));
  }, []);

  /**
   * Retake the questions. Finishing them replaces the coordinate here and on
   * the account, and restarts the filter (derivePalateRecord); pours already
   * logged stay in the ledger. Leaving partway changes nothing on the account.
   */
  const reset = useCallback(() => {
    startingOver.current = true;
    localStorage.removeItem('user_profile');
    quiz.resetQuiz();
    setUserProfile(null);
    setScreen('questionnaire');
  }, [quiz]);

  // "Retake the questions" on /account lands here.
  useEffect(() => {
    if (takeParam(START_OVER_PARAM)) reset();
  }, [reset]);

  const finalUser = useMemo(() => profileToUser(userProfile), [userProfile]);

  let content;
  if (screen === 'reveal') {
    content = (
      <Reveal x={finalUser.x} y={finalUser.y} onContinue={() => setScreen('results')} onRetake={reset} />
    );
  } else if (screen === 'results') {
    content = (
      <ResultsScreen
        user={finalUser}
        hasCoordinate={!!userProfile}
        vibeTags={userProfile?.vibeTags || {}}
        register={register}
        onPalateUpdated={handlePalateUpdated}
        onRequestSignIn={() => setSignInOpen(true)}
        onStartOver={reset}
      />
    );
  } else {
    content = (
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

  return (
    <>
      {content}
      <SignInSheet open={signInOpen} onOpenChange={setSignInOpen} />
    </>
  );
}

export default function Home({
  register,
  signInEnabled,
}: {
  register: Register;
  signInEnabled: boolean;
}) {
  return (
    <AtprotoProvider enabled={signInEnabled}>
      <HomeContent register={register} />
    </AtprotoProvider>
  );
}

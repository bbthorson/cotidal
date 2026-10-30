import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ResultsScreen } from '@/components/app/ResultsScreen';
import { Questionnaire } from '@/components/app/Questionnaire';
import { Reveal } from '@/components/app/Reveal';
import { SignInSheet } from '@/components/app/SignInSheet';
import { AtprotoProvider, useAtprotoContext } from '@/components/app/AtprotoProvider';
import { useDiscoveryQuiz, type UserProfile } from '@/hooks/useDiscoveryQuiz';
import { flushPendingElicitation, getConnectedPalate, publishPalate } from '@/lib/api-client';
import { clearProfile, forgetDevice, loadProfile, saveProfile } from '@/lib/device-store';
import { userFromProfile } from '@/lib/profile';
import { SIGNED_OUT_PARAM, START_OVER_PARAM } from '@/lib/atproto/paths';
import type { Register } from '@/lib/register';

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

/** After a sign-out (the header's form lands here marked), forget this device's copy (device-store.ts). */
function forgetDeviceAfterSignOut(): void {
  if (takeParam(SIGNED_OUT_PARAM)) forgetDevice();
}

function wantsBrowse(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('browse') === '1';
}

/**
 * The first visit is three beats (docs/design-system.md, "The first-visit
 * flow"): the questions, the reveal, then the menu. A returning visitor goes straight to the menu.
 */
type Screen = 'questionnaire' | 'reveal' | 'results';

function HomeContent({ register }: { register: Register }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    // Before anything reads the device's palate.
    forgetDeviceAfterSignOut();
    return loadProfile();
  });
  const [screen, setScreen] = useState<Screen>(() => {
    if (typeof window === 'undefined') return 'questionnaire';
    return loadProfile() || wantsBrowse() ? 'results' : 'questionnaire';
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
            saveProfile(profile);
            setScreen('results');
          } else {
            const guest = loadProfile();
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

  /**
   * Retake the questions. Finishing them replaces the coordinate here and on
   * the account, and restarts the filter (derivePalateRecord); pours already
   * logged stay in the ledger. Leaving partway changes nothing on the account.
   */
  const reset = useCallback(() => {
    startingOver.current = true;
    clearProfile();
    quiz.resetQuiz();
    setUserProfile(null);
    setScreen('questionnaire');
  }, [quiz]);

  // "Retake the questions" on /account lands here.
  useEffect(() => {
    if (takeParam(START_OVER_PARAM)) reset();
  }, [reset]);

  const finalUser = useMemo(() => userFromProfile(userProfile), [userProfile]);

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

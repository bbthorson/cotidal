import { useState, useCallback, useEffect } from 'react';
import { Questionnaire } from '@/components/app/Questionnaire';
import { Reveal } from '@/components/app/Reveal';
import { AtprotoProvider } from '@/components/app/AtprotoProvider';
import { useDiscoveryQuiz, type UserProfile } from '@/hooks/useDiscoveryQuiz';
import { getConnectedPalate } from '@/lib/api-client';
import { clearProfile, loadProfile, saveProfile } from '@/lib/device-store';
import { START_OVER_PARAM } from '@/lib/atproto/paths';
import { takeParam } from '@/lib/url-params';

const COMPASS = '/compass';

/**
 * The questions and the reveal: two beats, on a page of their own. Finishing
 * hands over to Compass.
 *
 * Someone who already has a coordinate is sent straight on to Compass — the
 * landing page's "Find your coordinate" is the same link for everyone — unless
 * they came to start over (`?startover=1`, from Log's account), which clears
 * this device's copy first. The coordinate on a member's account is replaced
 * when the new one is published (`useDiscoveryQuiz`), not before: leaving
 * partway changes nothing there.
 */
function QuestionsContent({ member }: { member: boolean }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const handleComplete = useCallback((finished: UserProfile) => {
    // The quiz has published the new palate (useDiscoveryQuiz).
    setProfile(finished);
  }, []);
  const quiz = useDiscoveryQuiz(handleComplete);
  const { resetQuiz } = quiz;

  useEffect(() => {
    if (takeParam(START_OVER_PARAM)) {
      clearProfile();
      resetQuiz();
      return;
    }
    if (loadProfile()) {
      window.location.replace(COMPASS);
      return;
    }
    if (!member) return;
    let cancelled = false;
    getConnectedPalate().then((remote) => {
      if (cancelled || !remote) return;
      saveProfile(remote);
      window.location.replace(COMPASS);
    });
    return () => {
      cancelled = true;
    };
  }, [member, resetQuiz]);

  const retake = useCallback(() => {
    clearProfile();
    quiz.resetQuiz();
    setProfile(null);
  }, [quiz]);

  if (profile) {
    return (
      <Reveal
        x={Math.max(-10, Math.min(10, profile.x))}
        y={Math.max(-10, Math.min(10, profile.y))}
        onContinue={() => window.location.assign(COMPASS)}
        onRetake={retake}
      />
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
      onExploreAsGuest={() => window.location.assign(COMPASS)}
    />
  );
}

export default function Questions({
  signInEnabled,
  member,
}: {
  signInEnabled: boolean;
  member: { handle: string | null } | null;
}) {
  return (
    <AtprotoProvider enabled={signInEnabled}>
      <QuestionsContent member={!!member} />
    </AtprotoProvider>
  );
}

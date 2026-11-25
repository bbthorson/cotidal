import { useState, useCallback, useEffect } from 'react';
import { Questionnaire } from '@/components/app/Questionnaire';
import { Reveal } from '@/components/app/Reveal';
import { AtprotoProvider } from '@/components/app/AtprotoProvider';
import { MapScreen } from '@/components/app/MapScreen';
import { PalateMap } from '@/components/app/PalateMap';
import { chart, explore, hero } from '@/lib/copy';
import { quadrantFor } from '@/lib/quadrant';
import { useDiscoveryQuiz, type UserProfile } from '@/hooks/useDiscoveryQuiz';
import { getConnectedPalate } from '@/lib/api-client';
import { clearProfile, loadProfile, saveProfile } from '@/lib/device-store';
import { START_OVER_PARAM } from '@/lib/atproto/paths';
import { DRINK_PARAM, drinkMapHref, mapHref as MAP } from '@/lib/site-nav';
import { takeParam } from '@/lib/url-params';

/**
 * The questions and the reveal: two beats, in the card over the map
 * (`MapScreen`, docs/map-first.md). While the questions run, the map draws
 * the shoal narrowing where the answers point; when they finish, the point
 * settles there and the card turns to the reveal. Finishing hands over to
 * the map.
 *
 * Someone who already has a coordinate is sent straight on to Compass — the
 * landing page's "Find your coordinate" is the same link for everyone — unless
 * they came to start over (`?startover=1`, from Settings, or the foot of Your map for a guest), which clears
 * this device's copy first. The coordinate on a member's account is replaced
 * when the new one is published (`useDiscoveryQuiz`), not before: leaving
 * partway changes nothing there.
 */
/**
 * Where the questions hand over: the map, or the map open on the drink the
 * reader came from (`/questions?drink=<slug>`, a drink page's one action).
 */
function nextHref(): string {
  if (typeof window === 'undefined') return MAP;
  const slug = new URLSearchParams(window.location.search).get(DRINK_PARAM);
  return slug ? drinkMapHref(slug) : MAP;
}

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
      window.location.replace(nextHref());
      return;
    }
    if (!member) return;
    let cancelled = false;
    getConnectedPalate().then((remote) => {
      if (cancelled || !remote) return;
      saveProfile(remote);
      window.location.replace(nextHref());
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

  const answering = !profile;
  const axes = quiz.belief.axes;
  const x = profile ? Math.max(-10, Math.min(10, profile.x)) : 0;
  const y = profile ? Math.max(-10, Math.min(10, profile.y)) : 0;

  return (
    <MapScreen
      mode="live"
      rest="tall"
      label={hero.primaryCta}
      tone={answering ? 'card' : 'reveal'}
      map={
        <PalateMap
          label={explore.chartLabel}
          shoal={
            answering && axes
              ? { x: axes.x.mean, y: axes.y.mean, rx: Math.sqrt(axes.x.variance), ry: Math.sqrt(axes.y.variance) }
              : null
          }
          points={profile ? [{ x, y, label: chart.youIn(quadrantFor(x, y).name), tone: 'yours' }] : undefined}
        />
      }
    >
      {profile ? (
        <Reveal x={x} y={y} onContinue={() => window.location.assign(nextHref())} onRetake={retake} />
      ) : (
        <Questionnaire
          currentQuestion={quiz.currentQuestion}
          progress={quiz.progress}
          questionCount={quiz.questionCount}
          isNavigating={quiz.isNavigating}
          canGoBack={quiz.canGoBack}
          onSelectOption={quiz.handleAnswer}
          onBack={quiz.handleBack}
          onExploreAsGuest={() => window.location.assign(nextHref())}
        />
      )}
    </MapScreen>
  );
}

export default function Questions({
  signInEnabled,
  member,
}: {
  signInEnabled: boolean;
  member: { did: string; handle: string | null } | null;
}) {
  return (
    <AtprotoProvider enabled={signInEnabled} member={member}>
      <QuestionsContent member={!!member} />
    </AtprotoProvider>
  );
}

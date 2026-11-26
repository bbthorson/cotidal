import { useCallback, useEffect, useState } from 'react';
import type { AxisBelief } from '@/lib/belief-state';
import { useDiscoveryQuiz, type UserProfile } from '@/hooks/useDiscoveryQuiz';
import { Questionnaire } from './Questionnaire';
import { Reveal } from './Reveal';

/**
 * The questions and the reveal, as a state of the map's card (`/map?quiz=1`,
 * `Explore.tsx`), never a page of their own: two beats over the map. While
 * the questions run, the map draws the ground the answers so far make and the
 * shoal narrowing where they point (`onShoal`); when they finish, the point settles there (`onPoint`)
 * and the card turns to the reveal on its ink ground. Continue hands the
 * new coordinate to the map (`onDone`), which is already on the drink the
 * reader came from, if any.
 *
 * The coordinate on a member's account is replaced when the new one is
 * published (`useDiscoveryQuiz`), not before: leaving partway changes
 * nothing there.
 */
export function QuizCard({
  onShoal,
  onPoint,
  onDone,
  onSkip,
  onAnswered,
}: {
  onShoal: (axes: Record<'x' | 'y', AxisBelief> | null) => void;
  /** Once the first question is answered: from then a coordinate arriving from elsewhere no longer answers them. */
  onAnswered: () => void;
  onPoint: (point: { x: number; y: number } | null) => void;
  onDone: (profile: UserProfile) => void;
  onSkip: () => void;
}) {
  const [finished, setFinished] = useState<UserProfile | null>(null);
  const handleComplete = useCallback((p: UserProfile) => setFinished(p), []);
  const quiz = useDiscoveryQuiz(handleComplete);
  const axes = quiz.belief.axes;

  useEffect(() => {
    onShoal(axes ?? null);
  }, [axes, onShoal]);
  useEffect(() => {
    if (quiz.questionCount > 0) onAnswered();
  }, [quiz.questionCount, onAnswered]);

  const clamp = (v: number) => Math.max(-10, Math.min(10, v));
  const point = finished ? { x: clamp(finished.x), y: clamp(finished.y) } : null;
  useEffect(() => {
    onPoint(point);
    // `point` is derived from `finished`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, onPoint]);

  if (finished && point) {
    return (
      <Reveal
        x={point.x}
        y={point.y}
        onContinue={() => onDone(finished)}
        onRetake={() => {
          setFinished(null);
          quiz.resetQuiz();
        }}
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
      onExploreAsGuest={onSkip}
    />
  );
}

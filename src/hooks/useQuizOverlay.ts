import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AxisBelief } from '@/lib/palate/belief-state';
import type { UserProfile } from '@/lib/palate/profile';
import { buildTerrain, sampleTerrain } from '@/lib/palate/terrain';
import { QUIZ_PARAM, START_OVER_PARAM } from '@/lib/atproto/paths';
import { takeParam } from '@/lib/utils';

/**
 * The questions, as an overlay state of `/map`'s card (`?quiz=1` or `?startover=1`):
 * holds the live shoal/ground as answers come in, the settled reveal point,
 * and auto-closes if a stored coordinate arrives before the user answers.
 */
export function useQuizOverlay(profile: UserProfile | null, forgetProfile: () => void) {
  const [open, setOpen] = useState(false);
  const [shoal, setShoal] = useState<Record<'x' | 'y', AxisBelief> | null>(null);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [answered, setAnswered] = useState(false);
  const startOver = useRef(false);

  const ground = useMemo(
    () =>
      shoal
        ? sampleTerrain(
            buildTerrain({ x: shoal.x.mean, y: shoal.y.mean, variance: { x: shoal.x.variance, y: shoal.y.variance } }, []),
            1
          )
        : null,
    [shoal]
  );

  const markAnswered = useCallback(() => setAnswered(true), []);
  const openQuiz = useCallback(() => setOpen(true), []);
  const closeQuiz = useCallback(() => {
    setOpen(false);
    setShoal(null);
    setPoint(null);
    setAnswered(false);
    startOver.current = false;
  }, []);

  useEffect(() => {
    const over = takeParam(START_OVER_PARAM);
    if (!takeParam(QUIZ_PARAM) && !over) return;
    startOver.current = over;
    if (over) forgetProfile();
    setOpen(true);
    // Arrival only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A coordinate that arrives while the questions wait (this device's, or a member's account's) answers them.
  useEffect(() => {
    if (open && profile && !startOver.current && !answered) setOpen(false);
  }, [open, profile, answered]);

  return {
    open,
    shoal,
    setShoal,
    point,
    setPoint,
    ground,
    markAnswered,
    openQuiz,
    closeQuiz,
  };
}

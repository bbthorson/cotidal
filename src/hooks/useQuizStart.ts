import { useEffect, useMemo, useState } from 'react';
import type { ElicitationRecord } from '@/lib/atproto/elicitation-record';
import { getConnectedQuiz } from '@/lib/api-client';
import { loadLastQuiz } from '@/lib/device-store';
import { quizStart, type TrackStart } from '@/lib/track';

// One read of a member's quiz per page, however many screens and sheets ask.
let accountQuiz: Promise<ElicitationRecord | null> | null = null;

/**
 * Where your latest questions put you, and how sure they were: the start of
 * your track (`replayTrack`) and the first hill of your terrain
 * (`buildTerrain`). A member's quiz is read from their account, so it
 * follows them to another device; until it arrives, and for a guest, the
 * device's copy is used. `null` when there is no quiz at all.
 */
export function useQuizStart(member: boolean): TrackStart | null {
  const [device, setDevice] = useState<ElicitationRecord | null>(null);
  const [account, setAccount] = useState<ElicitationRecord | null>(null);

  useEffect(() => {
    setDevice(loadLastQuiz());
    if (!member) return;
    let cancelled = false;
    accountQuiz ??= getConnectedQuiz();
    void accountQuiz.then((quiz) => {
      if (!cancelled) setAccount(quiz);
    });
    return () => {
      cancelled = true;
    };
  }, [member]);

  return useMemo(() => {
    const quiz = account ?? device;
    return quiz ? quizStart(quiz) : null;
  }, [account, device]);
}

import { useEffect, useMemo, useState } from 'react';
import type { PourRecord } from '@/lib/atproto/records';
import type { ElicitationRecord } from '@/lib/atproto/elicitation-record';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import { getConnectedQuiz } from '@/lib/api-client';
import { loadLastQuiz } from '@/lib/device-store';
import { CENTRE_START, quizStart, replayTrack, type TrackPoint } from '@/lib/track';

/**
 * Your track, replayed from your latest quiz and your pours since
 * (`replayTrack`). A member's quiz is read from their account, so a track
 * follows them to another device; until it arrives, and for a guest, the
 * device's copy is used. With no quiz at all — a guest who tried a pour
 * first — the track starts at the centre.
 *
 * `null` while the pours load, and when the replay does not arrive where you
 * are: the screen then draws where you are and nothing behind it.
 */
export function useTrack(
  member: boolean,
  profile: UserProfile | null,
  pours: PourRecord[] | null
): { track: TrackPoint[] | null; fromQuiz: boolean } {
  const [device, setDevice] = useState<ElicitationRecord | null>(null);
  const [account, setAccount] = useState<ElicitationRecord | null>(null);

  useEffect(() => {
    setDevice(loadLastQuiz());
    if (!member) return;
    let cancelled = false;
    void getConnectedQuiz().then((quiz) => {
      if (!cancelled) setAccount(quiz);
    });
    return () => {
      cancelled = true;
    };
  }, [member]);

  return useMemo(() => {
    const quiz = account ?? device;
    if (!profile || !pours) return { track: null, fromQuiz: !!quiz };
    const start = quiz ? quizStart(quiz) : CENTRE_START;
    return { track: replayTrack(start, pours, profile, member ? 'record' : 'device'), fromQuiz: !!quiz };
  }, [account, device, member, profile, pours]);
}

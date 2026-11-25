import { useMemo } from 'react';
import type { PourRecord } from '@/lib/atproto/records';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import { useQuizStart } from '@/hooks/useQuizStart';
import { CENTRE_START, replayTrack, type TrackPoint } from '@/lib/track';

/**
 * Your track, replayed from your latest quiz (`useQuizStart`) and your pours
 * since (`replayTrack`). With no quiz at all — a guest who tried a pour
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
  const start = useQuizStart(member);
  return useMemo(() => {
    if (!profile || !pours) return { track: null, fromQuiz: !!start };
    return { track: replayTrack(start ?? CENTRE_START, pours, profile, member ? 'record' : 'device'), fromQuiz: !!start };
  }, [start, member, profile, pours]);
}

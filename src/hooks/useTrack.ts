import { useMemo } from 'react';
import type { PourRecord } from '@/lib/atproto/records';
import type { UserProfile } from '@/lib/palate/profile';
import { CENTRE_START, replayTrack, type TrackPoint, type TrackStart } from '@/lib/palate/track';

/**
 * Your track, replayed from your latest quiz (`start`) and your pours
 * since (`replayTrack`). With no quiz at all — a guest who tried a pour
 * first — the track starts at the centre.
 *
 * `null` while the pours load, and when the replay does not arrive where you
 * are: the screen then draws where you are and nothing behind it.
 */
export function useTrack(
  member: boolean,
  profile: UserProfile | null,
  pours: PourRecord[] | null,
  start: TrackStart | null
): { track: TrackPoint[] | null; fromQuiz: boolean } {
  return useMemo(() => {
    if (!profile || !pours) return { track: null, fromQuiz: !!start };
    return { track: replayTrack(start ?? CENTRE_START, pours, profile, member ? 'record' : 'device'), fromQuiz: !!start };
  }, [start, member, profile, pours]);
}

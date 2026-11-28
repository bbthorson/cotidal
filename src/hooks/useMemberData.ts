import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { ElicitationRecord } from '@/lib/atproto/elicitation-record';
import type { PourRecord } from '@/lib/atproto/records';
import type { UserProfile } from '@/lib/palate/profile';
import { flushPendingElicitation, getConnectedPours, getMemberSnapshot, logDrinkFeedback, publishPalate } from '@/lib/api-client';
import { clearGuestPours, clearProfile, loadGuestPours, loadLastQuiz, loadProfile, saveProfile, syncCoordinateMark } from '@/lib/device-store';
import { pourRecordToLogOptions } from '@/lib/pours/pour-entry';
import { quizStart, type TrackStart } from '@/lib/palate/track';

/**
 * A drinker's coordinate, pours, and latest quiz start, from wherever they
 * live: the device for a guest, or one `GET /api/me` bootstrap for a member
 * (keeping the coordinate mirrored on the device).
 *
 * The first render is the server's — no coordinate — because the server
 * cannot see the device. Reading localStorage in `useLayoutEffect` avoids a
 * hydration mismatch (#418) while painting before the first frame.
 *
 * A member's first visit also settles what a guest did before signing in:
 * pending quiz answers are flushed, a guest coordinate is written to the
 * account unless the account already has one (which wins), and any guest
 * pours logged on this device are imported when the account has none yet.
 */
export function useMemberData(member: boolean) {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [pours, setPours] = useState<PourRecord[] | null>(null);
  const [deviceQuiz, setDeviceQuiz] = useState<ElicitationRecord | null>(null);
  const [accountQuiz, setAccountQuiz] = useState<ElicitationRecord | null>(null);

  useLayoutEffect(() => {
    const local = loadProfile();
    if (local) setProfileState(local);
    syncCoordinateMark();
  }, []);

  useEffect(() => {
    setDeviceQuiz(loadLastQuiz());
    if (!member) {
      setPours(loadGuestPours());
      return;
    }

    let cancelled = false;
    void flushPendingElicitation();
    void getMemberSnapshot(50).then(async (snapshot) => {
      if (cancelled) return;
      setAccountQuiz(snapshot.quiz);

      if (snapshot.profile) {
        setProfileState(snapshot.profile);
        saveProfile(snapshot.profile);
      } else {
        const guest = loadProfile();
        if (guest) {
          await publishPalate(guest);
          if (!cancelled) setProfileState(guest);
        }
      }

      // If the account has no pours yet, migrate any guest pours waiting on this device (oldest first).
      const guestPours = snapshot.pours.length === 0 ? loadGuestPours() : [];
      if (guestPours.length > 0) {
        let latestProfile: UserProfile | null = null;
        let allOk = true;
        for (const p of [...guestPours].reverse()) {
          if (cancelled) return;
          const res = await logDrinkFeedback(pourRecordToLogOptions(p));
          if (res.success && res.profile) latestProfile = res.profile;
          else allOk = false;
        }
        if (allOk) clearGuestPours();
        if (!cancelled) {
          if (latestProfile) {
            setProfileState(latestProfile);
            saveProfile(latestProfile);
          }
          setPours(await getConnectedPours(50));
        }
        return;
      }

      setPours(snapshot.pours);
    });

    return () => {
      cancelled = true;
    };
  }, [member]);

  /** A new coordinate (after a pour or quiz): shown now, and kept on this device. */
  const setProfile = useCallback((next: UserProfile) => {
    setProfileState(next);
    saveProfile(next);
    // If a quiz just finished on this device, pick up its saved elicitation record too.
    setDeviceQuiz(loadLastQuiz());
  }, []);

  /** Forget this device's coordinate, to start over (`?startover=1`). */
  const forgetProfile = useCallback(() => {
    clearProfile();
    setProfileState(null);
  }, []);

  const reload = useCallback(async () => {
    if (!member) {
      setPours(loadGuestPours());
      return;
    }
    try {
      setPours(await getConnectedPours(50));
    } catch (e) {
      console.error('Failed to load pours:', e);
      setPours([]);
    }
  }, [member]);

  const start: TrackStart | null = useMemo(() => {
    const quiz = accountQuiz ?? deviceQuiz;
    return quiz ? quizStart(quiz) : null;
  }, [accountQuiz, deviceQuiz]);

  return { profile, setProfile, forgetProfile, pours, start, reload };
}

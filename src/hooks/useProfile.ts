import { useCallback, useEffect, useState } from 'react';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import { flushPendingElicitation, getConnectedPalate, publishPalate } from '@/lib/api-client';
import { loadProfile, saveProfile } from '@/lib/device-store';

/**
 * Your coordinate, from wherever it lives: the device for a guest, the
 * account for a member (kept on the device too, as a copy). `member` is the
 * server's answer (`accountFor`), so nothing waits to find out which.
 *
 * A member's first visit also settles what a guest did before signing in:
 * the coordinate and quiz answers waiting on the device are written to the
 * account, unless the account already has a coordinate, which wins.
 */
export function useProfile(member: boolean) {
  const [profile, setProfile] = useState<UserProfile | null>(loadProfile);

  useEffect(() => {
    if (!member) {
      const local = loadProfile();
      if (local) setProfile(local);
      return;
    }
    let cancelled = false;
    void flushPendingElicitation();
    getConnectedPalate().then(async (remote) => {
      if (cancelled) return;
      if (remote) {
        setProfile(remote);
        saveProfile(remote);
        return;
      }
      const guest = loadProfile();
      if (guest) {
        await publishPalate(guest);
        if (!cancelled) setProfile(guest);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [member]);

  /** A new coordinate (after a pour): shown now, and kept on this device. */
  const update = useCallback((next: UserProfile) => {
    setProfile(next);
    saveProfile(next);
  }, []);

  return [profile, update] as const;
}

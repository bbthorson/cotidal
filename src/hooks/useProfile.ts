import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import { flushPendingElicitation, getConnectedPalate, publishPalate } from '@/lib/api-client';
import { clearProfile, loadProfile, saveProfile } from '@/lib/device-store';

/**
 * Your coordinate, from wherever it lives: the device for a guest, the
 * account for a member (kept on the device too, as a copy). `member` is the
 * server's answer (`accountFor`), so nothing waits to find out which.
 *
 * A member's first visit also settles what a guest did before signing in:
 * the coordinate and quiz answers waiting on the device are written to the
 * account, unless the account already has a coordinate, which wins.
 *
 * The first render is the server's — no coordinate — because the server
 * cannot see the device. Reading it during render made the browser draw a
 * different page from the one it was handed, and React threw that page away
 * (error #418). The device's copy is read straight after, before paint.
 */
export function useProfile(member: boolean) {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useLayoutEffect(() => {
    const local = loadProfile();
    if (local) setProfile(local);
  }, []);

  useEffect(() => {
    if (!member) return;
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

  /** Forget this device's coordinate, to start over (`?startover=1`). An account's is replaced only when a new one is published. */
  const forget = useCallback(() => {
    clearProfile();
    setProfile(null);
  }, []);

  return [profile, update, forget] as const;
}

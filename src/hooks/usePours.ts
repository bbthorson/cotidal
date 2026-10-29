import { useCallback, useEffect, useState } from 'react';
import type { PourRecord } from '@/lib/atproto/records';
import { getConnectedPours } from '@/lib/api-client';
import { loadGuestPours } from '@/lib/device-store';

/**
 * Your pours, from wherever they live: a member's account, or a guest's
 * device. `member` is the server's answer (`accountFor`), passed down as a
 * prop, so the page knows which before anything loads. `null` until the
 * first read, so a page can tell "loading" from "none".
 */
export function usePours(member: boolean) {
  const [pours, setPours] = useState<PourRecord[] | null>(null);

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

  useEffect(() => {
    void reload();
  }, [reload]);

  return { pours, reload };
}

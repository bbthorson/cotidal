import { useCallback, useEffect, useState } from 'react';
import { parseRateRequest, withoutRateRequest, type RateRequest } from '@/lib/pour-draft';

/**
 * Whether the rating sheet is open, and on what. One hook for every screen
 * that can show it (Compass, Log), so the URL contract is handled in one
 * place: `?rate=<drink>` or `?draft=1&…` on arrival opens it (the same way
 * `?signin=1` opens the sign-in sheet), in-app triggers call `open()` with no
 * navigation, and closing takes the request out of the URL so a reload does
 * not offer the same pour again.
 *
 * `version` counts closings: a screen that keeps something on the device (the
 * waiting pick) reads it again when it changes.
 */
export function useRateSheet() {
  const [request, setRequest] = useState<RateRequest | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const asked = parseRateRequest(new URLSearchParams(window.location.search));
    if (asked) setRequest(asked);
  }, []);

  const open = useCallback((next: RateRequest = {}) => setRequest(next), []);

  const close = useCallback(() => {
    setRequest(null);
    setVersion((v) => v + 1);
    clearRateRequestFromUrl();
  }, []);

  return { request, open, close, version };
}

/** Take the request out of the address bar, leaving any other query and the hash. */
export function clearRateRequestFromUrl() {
  const here = new URL(window.location.href);
  const clean = withoutRateRequest(here);
  if (clean.href !== here.href) window.history.replaceState({}, '', clean.pathname + clean.search + clean.hash);
}

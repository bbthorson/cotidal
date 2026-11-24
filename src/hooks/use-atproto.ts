import { useEffect, useState } from 'react';
import { takeAuthError, type AuthError } from '@bbthorson/atproto-cf-auth/client';
import { getRecentAccounts } from '@/lib/atproto/accounts';

export interface MemberIdentity {
  did: string;
  handle: string | null;
}

interface AtprotoState {
  isEnabled: boolean;
  redirectError: AuthError | null;
}

/**
 * `isEnabled` is the server's answer (`signInEnabled()` in
 * src/lib/atproto/auth.ts), passed down from the page as a prop. The browser
 * cannot work it out for itself: anything it reads was fixed at build time.
 *
 * Also remembers the active signed-in member on this device so their next
 * sign-in takes one tap, and consumes `?auth_error=` after a failed callback.
 */
export function useAtproto(isAtprotoEnabled: boolean, member?: MemberIdentity | null): AtprotoState {
  const [redirectError, setRedirectError] = useState<AuthError | null>(null);

  // A sign-in that failed on the way back lands here with the reason.
  useEffect(() => {
    if (!isAtprotoEnabled) return;
    const failure = takeAuthError();
    if (failure) setRedirectError(failure);
  }, [isAtprotoEnabled]);

  // Remember a signed-in member on this device for one-tap return sign-in.
  const did = member?.did;
  const handle = member?.handle ?? undefined;
  useEffect(() => {
    if (!isAtprotoEnabled || !did) return;
    void getRecentAccounts().remember({ did, handle });
  }, [isAtprotoEnabled, did, handle]);

  return { isEnabled: isAtprotoEnabled, redirectError };
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AUTH_ERROR_MESSAGES, createAuthClient, takeAuthError } from '@bbthorson/atproto-cf-auth/client';
import { AUTH_BASE_PATH } from '@/lib/atproto/paths';

interface AtprotoState {
  isEnabled: boolean;
  connecting: boolean;
  error: string | null;
  connect: (handle: string) => Promise<void>;
}

/**
 * `isEnabled` is the server's answer (`signInEnabled()` in
 * src/lib/atproto/auth.ts), passed down from the page as a prop. The browser
 * cannot work it out for itself: anything it reads was fixed at build time.
 *
 * This starts a sign-in and reports why one failed. Whether someone *is*
 * signed in is the server's answer too (`accountFor`), which each page hands
 * to its island: the session cookie is HttpOnly and opaque to the browser.
 */
export function useAtproto(isAtprotoEnabled: boolean): AtprotoState {
  const auth = useMemo(() => createAuthClient({ basePath: AUTH_BASE_PATH }), []);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A sign-in that failed on the way back lands here with the reason.
  useEffect(() => {
    if (!isAtprotoEnabled) return;
    const failure = takeAuthError();
    if (failure) setError(failure.message);
  }, [isAtprotoEnabled]);

  const connect = useCallback(
    async (inputHandle: string) => {
      if (!isAtprotoEnabled) return;
      setConnecting(true);
      setError(null);
      try {
        // Navigates to Bluesky on success; throws an AuthError otherwise.
        await auth.signIn(inputHandle, { returnTo: window.location.pathname });
      } catch (e) {
        setError(e instanceof Error ? e.message : AUTH_ERROR_MESSAGES.authorize_failed);
        setConnecting(false);
      }
    },
    [auth, isAtprotoEnabled]
  );

  return { isEnabled: isAtprotoEnabled, connecting, error, connect };
}

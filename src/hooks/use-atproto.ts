import { useCallback, useEffect, useMemo, useState } from 'react';
import { AUTH_ERROR_MESSAGES, createAuthClient, takeAuthError } from '@bbthorson/atproto-cf-auth/client';
import { AUTH_BASE_PATH } from '@/lib/atproto/paths';


interface AtprotoState {
  isEnabled: boolean;
  isConnected: boolean;
  did: string | null;
  handle: string | null;
  connecting: boolean;
  error: string | null;
  connect: (handle: string) => Promise<void>;
}

/**
 * `isEnabled` is the server's answer (`signInEnabled()` in
 * src/lib/atproto/auth.ts), passed down from the page as a prop. The browser
 * cannot work it out for itself: anything it reads was fixed at build time.
 */
export function useAtproto(isAtprotoEnabled: boolean): AtprotoState {
  const auth = useMemo(() => createAuthClient({ basePath: AUTH_BASE_PATH }), []);
  const [did, setDid] = useState<string | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Who is signed in is the server's answer, not something the page can read:
  // the session cookie is HttpOnly and opaque.
  useEffect(() => {
    if (!isAtprotoEnabled) return;

    const failure = takeAuthError();
    if (failure) setError(failure.message);

    let cancelled = false;
    auth
      .getUser()
      .then((user) => {
        if (cancelled || !user) return;
        setDid(user.did);
        setHandle(user.handle ?? null);
      })
      .catch(() => {
        // Offline or unconfigured: stay a guest.
      });
    return () => {
      cancelled = true;
    };
  }, [auth, isAtprotoEnabled]);

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


  return {
    isEnabled: isAtprotoEnabled,
    isConnected: !!did,
    did,
    handle,
    connecting,
    error,
    connect,
  };
}

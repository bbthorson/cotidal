import { useMemo, useState, useEffect } from 'react';
import { useAtproto } from '@/hooks/use-atproto';
import { forgetDevice } from '@/lib/device-store';
import { SIGNED_OUT_PARAM } from '@/lib/atproto/paths';
import { takeParam } from '@/lib/url-params';
import { AtprotoContext } from './AtprotoContext';
import { SignInSheet } from './SignInSheet';

export { useAtprotoContext } from './AtprotoContext';

/**
 * What every island shares about signing in: whether it is on, the one
 * sign-in sheet, and two things a URL can ask for.
 *
 * - `?signin=1` — the header's "Come aboard" on an app page opens the sheet
 *   instead of leaving for the landing page's form (`signInHref`).
 * - `?signed_out=1` — a form sign-out landed here (`signedOutPath`), so this
 *   device's copy of the coordinate is forgotten before anything reads it.
 *
 * Who is signed in is not decided here: the server says (`accountFor`), and
 * each page passes it down as `member`.
 */
export function AtprotoProvider({
  enabled,
  children,
}: {
  /** From `signInEnabled()`, rendered by the page that mounts the island. */
  enabled: boolean;
  children: React.ReactNode;
}) {
  const atproto = useAtproto(enabled);
  const [signInOpen, setSignInOpen] = useState(false);

  // In render, ahead of the island's own first reads of the device.
  useState(() => {
    if (takeParam(SIGNED_OUT_PARAM)) forgetDevice();
  });

  useEffect(() => {
    if (takeParam('signin')) setSignInOpen(true);
  }, []);

  const value = useMemo(() => ({ ...atproto, openSignIn: () => setSignInOpen(true) }), [atproto]);

  return (
    <AtprotoContext.Provider value={value}>
      {children}
      <SignInSheet open={signInOpen} onOpenChange={setSignInOpen} />
    </AtprotoContext.Provider>
  );
}

import type { OAuthSession } from '@bbthorson/atproto-cf-auth/server';
import { getAuth } from './auth';

/**
 * Who is asking, and whether they can prove it.
 *
 * The session cookie is an opaque random id; the DID it maps to lives in the
 * sealed server-side store, so there is no client-supplied identity to forge.
 * Resolving the OAuth session also restores the user's tokens, which is the
 * check that they are still valid. Anything billed or destructive gates here.
 * See docs/generation.md.
 */

/** The caller's OAuth session (refreshed if needed), or `null` for a guest. */
export async function oauthSession(request: Request): Promise<OAuthSession | null> {
  const auth = await getAuth();
  if (!auth) return null;
  try {
    return await auth.getOAuthSession(request);
  } catch {
    return null;
  }
}

/** The DID of a caller whose session actually restores, or `null`. */
export async function restoredDid(request: Request): Promise<string | null> {
  return (await oauthSession(request))?.did ?? null;
}

/**
 * Who the page is being rendered for, as the header and the pages that pass it to their island show it.
 *
 * - `member`: a signed-in visitor, read from the session cookie (no token
 *   refresh: rendering a page is not a reason to call the PDS).
 * - `guest`: nobody signed in. `canSignIn` is false when sign-in is off here.
 * - `unknown`: the page was prerendered at build time, before any visitor, so
 *   it cannot know and must not guess (`/drinks`, `/regions/*`).
 */
export type Account =
  | { kind: 'member'; did: string; handle: string | null }
  | { kind: 'guest'; canSignIn: boolean }
  | { kind: 'unknown' };

export async function accountFor(request: Request, prerendered: boolean): Promise<Account> {
  if (prerendered) return { kind: 'unknown' };
  const auth = await getAuth();
  if (!auth) return { kind: 'guest', canSignIn: false };
  try {
    const user = await auth.getUser(request);
    if (user) return { kind: 'member', did: user.did, handle: user.handle ?? null };
  } catch {
    // An unreadable session is no session.
  }
  return { kind: 'guest', canSignIn: true };
}

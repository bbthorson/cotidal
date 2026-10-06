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

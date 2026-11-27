import type { OAuthSession } from '@bbthorson/atproto-cf-auth/server';
import { getAuth } from '../atproto/auth';
import { getPours } from '../atproto/publish';
import { logPour, sessionStore } from '../pours/pours.server';
import type { MemberTools } from './tools';

/**
 * `/mcp/me`'s tools as its member, through their own AT-Proto session,
 * restored from the DID the assistant's grant carries (`auth.restore`). The
 * restore runs under the same `AUTH_LOCK` as every page's, so a tool call and
 * a page cannot both spend one refresh token. It happens at most once per
 * request, and only when a tool needs it.
 */
export function memberTools(did: string, origin: string): MemberTools {
  let restoring: Promise<OAuthSession | null> | undefined;
  const session = () =>
    (restoring ??= (async () => {
      const auth = await getAuth();
      if (!auth) return null;
      try {
        return await auth.restore(did, { origin });
      } catch (e) {
        console.error('Could not restore a member session for /mcp/me:', e);
        return null;
      }
    })());

  return {
    did,
    async recentPours(limit) {
      const s = await session();
      return s ? getPours(s, limit) : null;
    },
    async logPour(options) {
      const s = await session();
      return s ? logPour(sessionStore(s), options, { appUrl: origin }) : null;
    },
  };
}

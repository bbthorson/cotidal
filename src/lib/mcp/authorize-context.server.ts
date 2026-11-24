import type { OAuthHelpers } from '@cloudflare/workers-oauth-provider';
import { getAuth } from '../atproto/auth';
import { restoredDid } from '../atproto/session';
import { workersEnv } from '../runtime';
import type { MemberSignIn } from './authorize.server';
import { oauthApi } from './member-auth';

/**
 * The two collaborators `/oauth/authorize` and `/oauth/callback` need, from
 * this Worker's bindings: the OAuth provider's helpers and the Bluesky
 * sign-in. `null` when either is off, and the pages answer 404: an assistant
 * cannot be signed in where members cannot be.
 */
export async function authorizeContext(
  url: URL
): Promise<{ oauth: OAuthHelpers; signIn: MemberSignIn } | null> {
  const auth = await getAuth();
  const oauth = oauthApi(url, await workersEnv());
  if (!auth || !oauth) return null;
  return {
    oauth,
    signIn: {
      getUser: (request) => auth.getUser(request),
      restoredDid,
      authorize: (request, input) => auth.authorize(request, input),
    },
  };
}

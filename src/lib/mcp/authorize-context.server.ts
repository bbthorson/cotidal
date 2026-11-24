import type { OAuthHelpers } from '@cloudflare/workers-oauth-provider';
import { getAuth } from '../atproto/auth';
import { restoredDid } from '../atproto/session';
import { workersEnv } from '../runtime';
import type { MemberSignIn } from './authorize.server';
import { MEMBER_MCP_PATH, oauthApi } from './member-auth';

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

/**
 * The `/mcp/me` address, when an assistant can be signed in here, or `null`:
 * the same answer the routes act on, so a page offers the address exactly
 * when it works.
 */
export async function memberMcpAddress(url: URL): Promise<string | null> {
  return (await authorizeContext(url)) ? new URL(MEMBER_MCP_PATH, url).toString() : null;
}

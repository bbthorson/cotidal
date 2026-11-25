import type { APIRoute } from 'astro';
import { answerMember, type ProviderContext } from '@/lib/mcp/member-endpoint';
import { memberTools } from '@/lib/mcp/member-tools.server';
import { readPublicPalate } from '@/lib/atproto/public-read';
import { readPublicVenue } from '@/lib/atproto/venue-read';
import { loadRegister } from '@/lib/register.server';

/**
 * One member's MCP endpoint (src/lib/mcp/member-endpoint.ts). Requests reach
 * it only through the OAuth provider in `src/worker.ts` (`withMemberSignIn`),
 * which checks the bearer token and hands over the member's DID as
 * `ctx.props` and what the token was granted as `ctx.auth`. Without the
 * provider (no `OAUTH_KV`, or off Workers) there is no member and the route
 * does not exist.
 *
 * The tools are `/mcp`'s, with the handle optional (it means the member),
 * plus the member's own pours and logging one (docs/mcp.md).
 */
export const prerender = false;

export const ALL: APIRoute = async ({ request, locals, url }) => {
  const register = await loadRegister();
  return answerMember(
    request,
    (locals as { cfContext?: ProviderContext }).cfContext,
    {
      readPalate: (actor) => readPublicPalate(actor, { taste: true }),
      readVenue: (actor) => readPublicVenue(actor),
      register,
      origin: url.origin,
    },
    (did) => memberTools(did, url.origin, register)
  );
};

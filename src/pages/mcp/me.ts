import type { APIRoute } from 'astro';
import { memberFromContext } from '@/lib/mcp/member-auth';
import { serveMcp } from '@/lib/mcp/serve';
import { readPublicPalate } from '@/lib/atproto/public-read';
import { loadRegister } from '@/lib/register.server';

/**
 * One member's MCP endpoint. Requests reach it only through the OAuth
 * provider in `src/worker.ts` (`withMemberSignIn`), which checks the bearer
 * token and hands over the member's DID as `ctx.props`; the DID is read from
 * there and nowhere else, never from the request. Without the provider (no
 * `OAUTH_KV`, or off Workers) there is no member and the route does not exist.
 *
 * The tools are `/mcp`'s for now. Tools that default to the member and log
 * pours as them come next (docs/mcp.md).
 */
export const prerender = false;

export const ALL: APIRoute = async ({ request, locals, url }) => {
  const member = memberFromContext((locals as { cfContext?: { props?: unknown } }).cfContext);
  if (!member) return new Response('Not found', { status: 404 });

  return serveMcp(request, {
    readPalate: (actor) => readPublicPalate(actor),
    register: await loadRegister(),
    origin: url.origin,
  });
};

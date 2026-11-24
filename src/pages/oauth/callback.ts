import type { APIRoute } from 'astro';
import { finish } from '@/lib/mcp/authorize.server';
import { authorizeContext } from '@/lib/mcp/authorize-context.server';
import { assistantConsent } from '@/lib/copy';

/**
 * Back from the Bluesky sign-in that `/oauth/authorize` started: complete the
 * assistant's grant for the member just signed in (src/lib/mcp/authorize.server.ts).
 */
export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  const context = await authorizeContext(url);
  if (!context) return new Response('Not found', { status: 404 });
  const result = await finish(request, context.oauth, context.signIn);
  if (result instanceof Response) return result;
  return new Response(`${assistantConsent.refusedTitle}. ${result.message}`, {
    status: 400,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
};

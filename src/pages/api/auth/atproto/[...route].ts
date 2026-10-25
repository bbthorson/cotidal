import type { APIRoute } from 'astro';
import { AUTH_ERROR_MESSAGES, AUTH_ERROR_PARAM } from '@bbthorson/atproto-cf-auth/server';
import { getAuth } from '../../../../lib/atproto/auth';
import { isFormSignOut, toSignedOut } from '../../../../lib/atproto/sign-out';

/**
 * `@bbthorson/atproto-cf-auth` serves everything under this path:
 * `POST login`, `GET callback`, `POST logout`, `GET session` and
 * `GET client-metadata.json`.
 *
 * Login is content-negotiated by the package the same way it was here before:
 * form-encoded in, 303 out (so `/` stays script-free); JSON in, JSON out for
 * the island.
 */

export const prerender = false;

function notConfigured(request: Request): Response {
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
    return new Response(null, {
      status: 303,
      headers: { Location: `/?${AUTH_ERROR_PARAM}=not_configured` },
    });
  }
  return Response.json(
    { error: 'not_configured', message: AUTH_ERROR_MESSAGES.not_configured },
    { status: 503 }
  );
}

export const ALL: APIRoute = async ({ request }) => {
  const auth = await getAuth();
  if (!auth) {
    // The session probe is not an error when sign-in is off: nobody is signed in.
    if (new URL(request.url).pathname.endsWith('/session') && request.method === 'GET') {
      return Response.json({ authenticated: false });
    }
    return notConfigured(request);
  }
  const response = await auth.handle(request);
  if (!response) return new Response('Not found', { status: 404 });
  return isFormSignOut(request, response) ? toSignedOut(response) : response;
};

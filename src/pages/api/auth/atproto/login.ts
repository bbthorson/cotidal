import type { APIRoute } from 'astro';
import { getAtprotoClient } from '../../../../lib/atproto/client';

/**
 * Content-negotiated so the sign-in form works with or without client JS.
 *
 *  - `application/json` body  -> JSON `{ url }` (used by the React app island)
 *  - form-encoded body        -> 303 redirect straight to the authorize URL,
 *                                so the marketing page needs zero JavaScript.
 */

function isFormPost(request: Request): boolean {
  const type = request.headers.get('content-type') ?? '';
  return (
    type.includes('application/x-www-form-urlencoded') ||
    type.includes('multipart/form-data')
  );
}

function fail(request: Request, status: number, code: string, message: string): Response {
  if (isFormPost(request)) {
    return new Response(null, {
      status: 303,
      headers: { Location: `/?error=${encodeURIComponent(code)}` },
    });
  }
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const client = getAtprotoClient();
  if (!client) {
    return fail(request, 503, 'not_configured', 'AT Protocol not configured');
  }

  let handle: string | undefined;

  if (isFormPost(request)) {
    const form = await request.formData();
    const value = form.get('handle');
    handle = typeof value === 'string' ? value.trim() : undefined;
  } else {
    try {
      const body = (await request.json()) as { handle?: string };
      handle = body.handle?.trim();
    } catch {
      return fail(request, 400, 'invalid_request', 'Invalid JSON');
    }
  }

  if (!handle) {
    return fail(request, 400, 'invalid_handle', 'Invalid handle');
  }

  try {
    const url = await client.authorize(handle);

    if (isFormPost(request)) {
      return new Response(null, {
        status: 303,
        headers: { Location: url.toString() },
      });
    }

    return new Response(JSON.stringify({ url: url.toString() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('AT Protocol authorize error:', e);
    return fail(request, 500, 'authorize_failed', 'Failed to initiate authorization');
  }
};

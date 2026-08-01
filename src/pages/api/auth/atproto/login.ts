import type { APIRoute } from 'astro';
import { getAtprotoClient } from '../../../../lib/atproto/client';

export const POST: APIRoute = async ({ request }) => {
  const client = getAtprotoClient();
  if (!client) {
    return new Response(JSON.stringify({ error: 'AT Protocol not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { handle?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body.handle) {
    return new Response(JSON.stringify({ error: 'Invalid handle' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = await client.authorize(body.handle);
    return new Response(JSON.stringify({ url: url.toString() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('AT Protocol authorize error:', e);
    return new Response(JSON.stringify({ error: 'Failed to initiate authorization' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

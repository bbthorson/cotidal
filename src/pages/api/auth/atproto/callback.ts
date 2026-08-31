import type { APIRoute } from 'astro';
import { getAtprotoClient } from '../../../../lib/atproto/client';

export const GET: APIRoute = async ({ request, redirect }) => {
  const client = getAtprotoClient();
  if (!client) {
    return redirect('/?error=atproto_not_configured');
  }

  const url = new URL(request.url);
  const params = url.searchParams;

  try {
    const { session } = await client.callback(params);
    const did = session.did;

    const response = redirect('/taste?connected=true');

    response.headers.append(
      'Set-Cookie',
      `atproto_did=${did}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
    );

    return response;
  } catch (e) {
    console.error('AT Protocol callback error:', e);
    return redirect('/?error=atproto_callback_failed');
  }
};

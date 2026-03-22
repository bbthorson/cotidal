import { NextRequest, NextResponse } from 'next/server';
import { getAtprotoClient } from '@/lib/atproto/client';
import { Agent } from '@atproto/api';

export async function GET(request: NextRequest) {
  const client = getAtprotoClient();
  if (!client) {
    return NextResponse.redirect(new URL('/?error=atproto_not_configured', request.url));
  }

  const params = new URLSearchParams(request.nextUrl.search);

  try {
    const { session } = await client.callback(params);
    const did = session.did;

    // Fetch the user's profile to get their handle and display name
    const agent = new Agent(session);
    const profile = await agent.getProfile({ actor: did });
    const handle = profile.data.handle;
    const displayName = profile.data.displayName || handle;

    // Build redirect URL
    const redirectUrl = new URL('/', request.url);
    redirectUrl.searchParams.set('connected', 'true');

    const response = NextResponse.redirect(redirectUrl);

    // Set HTTP-only cookie with DID for server-side session validation
    response.cookies.set('atproto_did', did, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // Set client-readable cookie with handle info for UI display
    response.cookies.set('atproto_handle', JSON.stringify({ handle, displayName }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (e) {
    console.error('AT Protocol callback error:', e);
    return NextResponse.redirect(new URL('/?error=atproto_callback_failed', request.url));
  }
}

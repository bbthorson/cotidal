import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.ATPROTO_CLIENT_ID
    ? new URL(process.env.ATPROTO_CLIENT_ID).origin
    : `http://127.0.0.1:${process.env.PORT || '9002'}`;

  const isProduction = !!process.env.ATPROTO_CLIENT_ID;

  const metadata = isProduction
    ? {
        client_id: process.env.ATPROTO_CLIENT_ID,
        client_name: 'The Crystal Coupe',
        client_uri: baseUrl,
        redirect_uris: [`${baseUrl}/api/auth/atproto/callback`],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        scope: 'atproto transition:generic',
        dpop_bound_access_tokens: true,
        token_endpoint_auth_method: 'none',
      }
    : {
        client_id: `http://localhost?redirect_uri=${encodeURIComponent(`${baseUrl}/api/auth/atproto/callback`)}&scope=${encodeURIComponent('atproto transition:generic')}`,
        client_name: 'The Crystal Coupe (Dev)',
        client_uri: baseUrl,
        redirect_uris: [`${baseUrl}/api/auth/atproto/callback`],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        scope: 'atproto transition:generic',
        dpop_bound_access_tokens: true,
        token_endpoint_auth_method: 'none',
      };

  return NextResponse.json(metadata, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

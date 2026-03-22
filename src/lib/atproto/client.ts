import { NodeOAuthClient } from '@atproto/oauth-client-node';
import { createSessionStore } from './session-store';
import { createStateStore } from './state-store';

let client: NodeOAuthClient | null = null;

function getBaseUrl(): string {
  if (process.env.ATPROTO_CLIENT_ID) {
    // Production: derive base URL from client ID
    const url = new URL(process.env.ATPROTO_CLIENT_ID);
    return `${url.protocol}//${url.host}`;
  }
  // Development: use loopback
  const port = process.env.PORT || '9002';
  return `http://127.0.0.1:${port}`;
}

export function getAtprotoClient(): NodeOAuthClient | null {
  if (!process.env.NEXT_PUBLIC_ATPROTO_ENABLED) return null;

  if (client) return client;

  const baseUrl = getBaseUrl();
  const isProduction = !!process.env.ATPROTO_CLIENT_ID;

  client = new NodeOAuthClient({
    clientMetadata: isProduction
      ? {
          client_id: process.env.ATPROTO_CLIENT_ID!,
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
          // Loopback client for development
          client_id: `http://localhost?redirect_uri=${encodeURIComponent(`${baseUrl}/api/auth/atproto/callback`)}&scope=${encodeURIComponent('atproto transition:generic')}`,
          client_name: 'The Crystal Coupe (Dev)',
          client_uri: baseUrl,
          redirect_uris: [`${baseUrl}/api/auth/atproto/callback`],
          grant_types: ['authorization_code', 'refresh_token'],
          response_types: ['code'],
          scope: 'atproto transition:generic',
          dpop_bound_access_tokens: true,
          token_endpoint_auth_method: 'none',
        },
    stateStore: createStateStore(),
    sessionStore: createSessionStore(),
  });

  return client;
}

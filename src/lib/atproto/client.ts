import { NodeOAuthClient } from '@atproto/oauth-client-node';
import { createSessionStore, createStateStore } from './store';

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
/**
 * The stores resolve their KV binding per call (`./store`), so the client is a
 * plain singleton and nothing has to hand it a request context.
 */
export function getAtprotoClient(): NodeOAuthClient | null {
  if (!process.env.PUBLIC_ATPROTO_ENABLED && !process.env.ATPROTO_ENABLED && !process.env.NEXT_PUBLIC_ATPROTO_ENABLED) return null;

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

    /**
     * Resolve handles over HTTP rather than DNS.
     *
     * Left unset, NodeOAuthClient builds an `AtprotoHandleResolverNode`, which
     * wraps fetch in undici-based SSRF protection and reads
     * `process.versions.undici`. workerd does not ship undici, so from
     * @atproto/oauth-client-node 0.5 that **throws in the constructor**:
     *
     *     Unicast SSRF protection requires Node.js 20.6+
     *
     * Naming an HTTP resolver skips that path entirely. It is the right choice
     * on Workers regardless of version, because the Node resolver's DNS lookups
     * are not something workerd can do either.
     */
    handleResolver: process.env.ATPROTO_HANDLE_RESOLVER || 'https://public.api.bsky.app',
  });

  return client;
}

import { OAuthProvider } from '@cloudflare/workers-oauth-provider';

/**
 * Signing a member in to a chat assistant, so `/mcp/me` can act as them.
 *
 * `/mcp` stays public and keeps no sign-in: anyone's assistant can read anyone's
 * public map, as `/p/<handle>` does. `/mcp/me` is the same server for one member,
 * and it needs to know which one. MCP clients find that out by OAuth: an
 * unauthenticated request gets a `401` naming this origin's protected-resource
 * metadata, the client registers, sends the person to `/oauth/authorize`, and
 * calls `/mcp/me` with the token it gets back (docs/mcp.md).
 *
 * Cotidal is the authorization server the assistant talks to; Bluesky (any
 * AT-Proto host) is only how the person proves who they are on the authorize
 * page. The assistant never holds an AT-Proto token. What a grant carries is
 * the member's DID (`MemberProps`), and the page restores their session from
 * it with `auth.restore(did)`.
 *
 * `@cloudflare/workers-oauth-provider` does the protocol: discovery documents,
 * client registration, the token endpoint and checking bearer tokens. It keeps
 * its records in the `OAUTH_KV` namespace, hashed and sealed. Without that
 * binding this module does nothing and every request goes straight to Astro,
 * which is what keeps `astro dev`, CI and a deploy without the namespace
 * exactly as they were.
 */

/** The member's own MCP endpoint. Everything under it needs a token. */
export const MEMBER_MCP_PATH = '/mcp/me';
export const OAUTH_AUTHORIZE_PATH = '/oauth/authorize';
export const OAUTH_TOKEN_PATH = '/oauth/token';
export const OAUTH_REGISTER_PATH = '/oauth/register';

/** The KV namespace the provider keeps clients, grants and tokens in. */
export const OAUTH_KV_BINDING = 'OAUTH_KV';

/**
 * What a member may let an assistant do. `palate:read` is the baseline any
 * access needs, so clients ask for it first; `pours:write` is asked for by
 * step-up only when a tool that logs a pour is called.
 */
export const MEMBER_SCOPES = { read: 'palate:read', write: 'pours:write' } as const;

/** What a grant holds, sealed by the provider; a page reads it as `cfContext.props`. */
export interface MemberProps {
  did: string;
}

/**
 * A grant's `userId` for a member. The provider keys grants by it, so it is
 * how a member's assistants are listed and revoked, but it refuses `:`, which
 * every DID has. Percent-encoding is reversible and cannot make two DIDs
 * collide. The DID the page acts on is `props.did`, never this.
 */
export function grantUserId(did: string): string {
  return encodeURIComponent(did);
}

export function didFromGrantUserId(userId: string): string {
  return decodeURIComponent(userId);
}

/** The context `/mcp/me` reads its member from (`Astro.locals.cfContext`). */
export function memberFromContext(ctx: { props?: unknown } | undefined): MemberProps | null {
  const did = (ctx?.props as Partial<MemberProps> | undefined)?.did;
  return typeof did === 'string' && did.startsWith('did:') ? { did } : null;
}

/**
 * The Worker's execution context, as far as this module needs it. The project
 * has no Workers type package (src/lib/runtime.ts declares its bindings the
 * same way); `props` is where the provider puts a grant's `MemberProps`.
 */
export interface WorkerContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
  props?: unknown;
}

interface FetchHandler<Env> {
  fetch(request: Request, env: Env, ctx: WorkerContext): Response | Promise<Response>;
}

type Env = Record<string, unknown>;

/**
 * An origin the provider can name as an issuer: https, or plain http on a
 * loopback host for `wrangler dev`. Anything else would throw at construction.
 */
function issuerOrigin(url: URL): string | null {
  if (url.protocol === 'https:') return url.origin;
  const loopback = url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '[::1]';
  return url.protocol === 'http:' && loopback ? url.origin : null;
}

/**
 * Wrap the Worker's handler. The provider names one canonical resource and
 * issuer, and this app answers on several origins (workers.dev, the custom
 * domain, loopback), the way `@bbthorson/atproto-cf-auth` derives its
 * `client_id` from each request. So there is one provider per origin, built on
 * first use: a token issued on one origin is good only there.
 */
export function withMemberSignIn<E extends Env>(app: FetchHandler<E>): FetchHandler<E> {
  const providers = new Map<string, FetchHandler<E>>();

  function providerFor(origin: string): FetchHandler<E> {
    let provider = providers.get(origin);
    if (!provider) {
      // The provider types its handlers with @cloudflare/workers-types'
      // ExecutionContext; at runtime it is the same object.
      provider = new OAuthProvider<E>({
        apiRoute: MEMBER_MCP_PATH,
        // The same Astro handler: `/mcp/me` reads the member from `ctx.props`.
        apiHandler: app as never,
        defaultHandler: app as never,
        authorizeEndpoint: OAUTH_AUTHORIZE_PATH,
        tokenEndpoint: OAUTH_TOKEN_PATH,
        clientRegistrationEndpoint: OAUTH_REGISTER_PATH,
        scopesSupported: [MEMBER_SCOPES.read, MEMBER_SCOPES.write],
        requiredScopes: [MEMBER_SCOPES.read],
        resourceMetadata: {
          resource: `${origin}${MEMBER_MCP_PATH}`,
          authorization_servers: [origin],
          resource_name: 'Cotidal',
        },
      }) as unknown as FetchHandler<E>;
      providers.set(origin, provider);
    }
    return provider;
  }

  return {
    fetch(request, env, ctx) {
      const origin = issuerOrigin(new URL(request.url));
      if (!env?.[OAUTH_KV_BINDING] || !origin) return app.fetch(request, env, ctx);
      return providerFor(origin).fetch(request, env, ctx);
    },
  };
}

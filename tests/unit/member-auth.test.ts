import { describe, expect, it } from 'vitest';
import {
  MEMBER_MCP_PATH,
  MEMBER_SCOPES,
  OAUTH_AUTHORIZE_PATH,
  OAUTH_REGISTER_PATH,
  OAUTH_TOKEN_PATH,
  didFromGrantUserId,
  grantUserId,
  memberFromContext,
  withMemberSignIn,
  type WorkerContext,
} from '@/lib/mcp/member-auth';

/**
 * The OAuth wrapper in front of the Worker (src/worker.ts): inert without
 * `OAUTH_KV`, and with it, a token for `/mcp/me` that carries the member's DID
 * to the page and nothing else does.
 */

const ORIGIN = 'https://cotidal.test';
const DID = 'did:plc:member1234567890abcdef';

/** KV in memory, with the parts of the interface the provider uses. */
function memoryKv() {
  const data = new Map<string, { value: string; metadata?: unknown; expires?: number }>();
  const live = (key: string) => {
    const entry = data.get(key);
    if (entry?.expires && entry.expires < Date.now()) data.delete(key);
    return data.get(key);
  };
  return {
    async get(key: string, type?: string | { type?: string }) {
      const entry = live(key);
      if (!entry) return null;
      const t = typeof type === 'string' ? type : type?.type;
      return t === 'json' ? JSON.parse(entry.value) : entry.value;
    },
    async getWithMetadata(key: string, type?: string | { type?: string }) {
      const entry = live(key);
      return { value: entry ? await this.get(key, type) : null, metadata: entry?.metadata ?? null };
    },
    async put(key: string, value: string, options: { expirationTtl?: number; metadata?: unknown } = {}) {
      data.set(key, {
        value,
        metadata: options.metadata,
        expires: options.expirationTtl ? Date.now() + options.expirationTtl * 1000 : undefined,
      });
    },
    async delete(key: string) {
      data.delete(key);
    },
    async list({ prefix = '' }: { prefix?: string } = {}) {
      const keys = [...data.keys()]
        .filter((name) => name.startsWith(prefix) && live(name))
        .map((name) => ({ name, metadata: data.get(name)?.metadata }));
      return { keys, list_complete: true, cursor: '' };
    },
  };
}

const ctx = () =>
  ({ waitUntil() {}, passThroughOnException() {}, props: {} }) as WorkerContext;

/** Stands in for Astro: records what reached it, and plays the authorize page. */
function fakeApp() {
  const seen: { path: string; props: unknown }[] = [];
  return {
    seen,
    async fetch(request: Request, env: Record<string, unknown>, c: WorkerContext) {
      const url = new URL(request.url);
      seen.push({ path: url.pathname, props: (c as { props?: unknown }).props });
      if (url.pathname === OAUTH_AUTHORIZE_PATH) {
        // The real page signs the person in first; here they are DID already.
        const oauth = env.OAUTH_PROVIDER as {
          parseAuthRequest(r: Request): Promise<{ scope: string[] }>;
          completeAuthorization(o: unknown): Promise<{ redirectTo: string }>;
        };
        const auth = await oauth.parseAuthRequest(request);
        const { redirectTo } = await oauth.completeAuthorization({
          request: auth,
          userId: grantUserId(DID),
          metadata: {},
          scope: auth.scope,
          props: { did: DID },
        });
        return Response.redirect(redirectTo, 302);
      }
      return new Response('astro', { status: 200 });
    },
  };
}

async function s256(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

describe('withMemberSignIn', () => {
  it('passes every request straight through without OAUTH_KV', async () => {
    const app = fakeApp();
    const worker = withMemberSignIn(app);
    const res = await worker.fetch(new Request(`${ORIGIN}${MEMBER_MCP_PATH}`), {}, ctx());
    expect(await res.text()).toBe('astro');
    expect(app.seen.map((s) => s.path)).toEqual([MEMBER_MCP_PATH]);
  });

  it('passes through on an origin that cannot be an issuer', async () => {
    const app = fakeApp();
    const worker = withMemberSignIn(app);
    const res = await worker.fetch(new Request(`http://cotidal.test${MEMBER_MCP_PATH}`), { OAUTH_KV: memoryKv() }, ctx());
    expect(res.status).toBe(200);
  });

  it('leaves the rest of the site, public /mcp included, to Astro', async () => {
    const app = fakeApp();
    const worker = withMemberSignIn(app);
    const env = { OAUTH_KV: memoryKv() };
    for (const path of ['/', '/compass', '/mcp']) {
      const res = await worker.fetch(new Request(`${ORIGIN}${path}`, { method: 'POST' }), env, ctx());
      expect(res.status, path).toBe(200);
    }
  });

  it('challenges an unauthenticated /mcp/me with this origin\'s resource metadata', async () => {
    const app = fakeApp();
    const worker = withMemberSignIn(app);
    const res = await worker.fetch(new Request(`${ORIGIN}${MEMBER_MCP_PATH}`, { method: 'POST' }), { OAUTH_KV: memoryKv() }, ctx());
    expect(res.status).toBe(401);
    const challenge = res.headers.get('www-authenticate') ?? '';
    expect(challenge).toContain(`resource_metadata="${ORIGIN}/.well-known/oauth-protected-resource${MEMBER_MCP_PATH}"`);
    expect(challenge).toContain(`scope="${MEMBER_SCOPES.read}"`);
    expect(app.seen).toEqual([]);
  });

  it('publishes discovery documents that point at each other', async () => {
    const worker = withMemberSignIn(fakeApp());
    const env = { OAUTH_KV: memoryKv() };
    const resource = await (
      await worker.fetch(new Request(`${ORIGIN}/.well-known/oauth-protected-resource${MEMBER_MCP_PATH}`), env, ctx())
    ).json();
    expect(resource).toMatchObject({
      resource: `${ORIGIN}${MEMBER_MCP_PATH}`,
      authorization_servers: [ORIGIN],
      scopes_supported: [MEMBER_SCOPES.read],
    });
    const server = await (
      await worker.fetch(new Request(`${ORIGIN}/.well-known/oauth-authorization-server`), env, ctx())
    ).json();
    expect(server).toMatchObject({
      issuer: ORIGIN,
      authorization_endpoint: `${ORIGIN}${OAUTH_AUTHORIZE_PATH}`,
      token_endpoint: `${ORIGIN}${OAUTH_TOKEN_PATH}`,
      registration_endpoint: `${ORIGIN}${OAUTH_REGISTER_PATH}`,
    });
  });

  it('hands the member\'s DID to /mcp/me, from the token and nowhere else', async () => {
    const app = fakeApp();
    const worker = withMemberSignIn(app);
    const env = { OAUTH_KV: memoryKv() };
    const call = (path: string, init?: RequestInit) => worker.fetch(new Request(`${ORIGIN}${path}`, init), env, ctx());

    // Register, as an MCP client does on first contact.
    const redirectUri = 'https://client.example/callback';
    const registered = await call(OAUTH_REGISTER_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ redirect_uris: [redirectUri], token_endpoint_auth_method: 'none', client_name: 'Test' }),
    });
    expect(registered.status).toBe(201);
    const { client_id } = (await registered.json()) as { client_id: string };

    // Authorize, with PKCE.
    const verifier = 'v'.repeat(64);
    const query = new URLSearchParams({
      response_type: 'code',
      client_id,
      redirect_uri: redirectUri,
      scope: MEMBER_SCOPES.read,
      state: 'xyz',
      code_challenge: await s256(verifier),
      code_challenge_method: 'S256',
      resource: `${ORIGIN}${MEMBER_MCP_PATH}`,
    });
    const authorized = await call(`${OAUTH_AUTHORIZE_PATH}?${query}`);
    expect(authorized.status).toBe(302);
    const code = new URL(authorized.headers.get('location')!).searchParams.get('code')!;
    expect(code).toBeTruthy();

    // Exchange the code.
    const token = await call(OAUTH_TOKEN_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id,
        code_verifier: verifier,
        resource: `${ORIGIN}${MEMBER_MCP_PATH}`,
      }),
    });
    expect(token.status).toBe(200);
    const { access_token } = (await token.json()) as { access_token: string };

    // The member's endpoint sees them.
    app.seen.length = 0;
    const res = await call(MEMBER_MCP_PATH, { method: 'POST', headers: { authorization: `Bearer ${access_token}` } });
    expect(res.status).toBe(200);
    expect(app.seen).toHaveLength(1);
    expect(memberFromContext({ props: app.seen[0].props })).toEqual({ did: DID });

    // A token from somewhere else does not.
    const forged = await call(MEMBER_MCP_PATH, { method: 'POST', headers: { authorization: 'Bearer nope:nope:nope' } });
    expect(forged.status).toBe(401);
  });
});

describe('grantUserId', () => {
  it('has no colon, and gives the DID back', () => {
    for (const did of [DID, 'did:web:example.com', 'did:web:example.com%3A8443']) {
      expect(grantUserId(did)).not.toContain(':');
      expect(didFromGrantUserId(grantUserId(did))).toBe(did);
    }
  });
});

describe('memberFromContext', () => {
  it('reads a DID from props and refuses anything else', () => {
    expect(memberFromContext({ props: { did: DID } })).toEqual({ did: DID });
    expect(memberFromContext({ props: {} })).toBeNull();
    expect(memberFromContext({ props: { did: 'alice.bsky.social' } })).toBeNull();
    expect(memberFromContext(undefined)).toBeNull();
  });
});

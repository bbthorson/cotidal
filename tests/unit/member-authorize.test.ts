import { describe, expect, it } from 'vitest';
import type { AuthorizeResult } from '@bbthorson/atproto-cf-auth/server';
import {
  MEMBER_MCP_PATH,
  MEMBER_SCOPES,
  OAUTH_AUTHORIZE_PATH,
  OAUTH_TOKEN_PATH,
  memberFromContext,
  oauthApi,
  withMemberSignIn,
  type WorkerContext,
} from '@/lib/mcp/member-auth';
import {
  OAUTH_CALLBACK_PATH,
  decide,
  finish,
  showConsent,
  type ConsentPage,
  type MemberSignIn,
} from '@/lib/mcp/authorize.server';
import { memoryKv } from './helpers/memory-kv';

/**
 * `/oauth/authorize` and `/oauth/callback` (src/lib/mcp/authorize.server.ts),
 * against the real OAuth provider over memory KV. Only the Bluesky sign-in is
 * a stand-in: it records where it was asked to send the person back, and the
 * test plays the person coming back signed in.
 */

const ORIGIN = 'https://cotidal.test';
const ALICE = 'did:plc:alice1234567890abcdefgh';
const BOB = 'did:plc:bob1234567890abcdefghij';
const REDIRECT = 'https://assistant.example/callback';
const VERIFIER = 'v'.repeat(64);

/** A browser's cookies, as far as these flows need them. */
class Jar {
  private cookies = new Map<string, string>();
  take(headers: Headers) {
    for (const c of headers.getSetCookie()) {
      const [pair, ...attrs] = c.split(';');
      const [name, ...rest] = pair.split('=');
      const value = rest.join('=');
      const expired = attrs.some((a) => /max-age=0\b/i.test(a.trim())) || value === '';
      if (expired) this.cookies.delete(name.trim());
      else this.cookies.set(name.trim(), value);
    }
  }
  header(): string {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  }
}

async function s256(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Who the stand-in sign-in says is signed in here, and what it was asked. */
function fakeSignIn() {
  const state = {
    user: null as { did: string; handle?: string; signedInAt: string } | null,
    restorable: true,
    asked: [] as { handle: string; returnTo: string }[],
  };
  const signIn: MemberSignIn = {
    getUser: async () => state.user,
    restoredDid: async () => (state.restorable ? (state.user?.did ?? null) : null),
    authorize: async (_req, input): Promise<AuthorizeResult> => {
      state.asked.push(input);
      if (input.handle === 'nobody.example') return { ok: false, error: 'handle_not_found', status: 400 };
      return { ok: true, url: 'https://bsky.example/oauth/authorize?x=1', cookies: ['bsky_auth_nonce=n0nce; Path=/; HttpOnly'] };
    },
  };
  return { state, signIn };
}

async function setUp() {
  const env = { OAUTH_KV: memoryKv() };
  const oauth = oauthApi(new URL(ORIGIN), env)!;
  const client = await oauth.createClient({
    redirectUris: [REDIRECT],
    tokenEndpointAuthMethod: 'none',
    clientName: 'Test Assistant',
  });
  const seen: unknown[] = [];
  const worker = withMemberSignIn({
    fetch: async (_r: Request, _e: unknown, c: WorkerContext) => {
      seen.push(c.props);
      return new Response('ok');
    },
  });
  const ctx = { waitUntil() {}, passThroughOnException() {}, props: {} } as WorkerContext;
  const jar = new Jar();
  const { state, signIn } = fakeSignIn();

  const authorizeUrl = async (scope = MEMBER_SCOPES.read) =>
    `${ORIGIN}${OAUTH_AUTHORIZE_PATH}?${new URLSearchParams({
      response_type: 'code',
      client_id: client.clientId,
      redirect_uri: REDIRECT,
      scope,
      state: 'client-state',
      code_challenge: await s256(VERIFIER),
      code_challenge_method: 'S256',
      resource: `${ORIGIN}${MEMBER_MCP_PATH}`,
    })}`;

  /** GET the consent page, as this browser. */
  const open = async (scope?: string) => {
    const page = (await showConsent(
      new Request(await authorizeUrl(scope), { headers: { cookie: jar.header() } }),
      oauth,
      signIn
    )) as ConsentPage;
    expect(page.kind).toBe('consent');
    jar.take(page.headers);
    return page;
  };

  /** POST the consent form, as this browser. */
  const post = async (fields: Record<string, string | string[]>, cookie = jar.header()) => {
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(fields)) for (const one of [v].flat()) body.append(k, one);
    const result = await decide(
      new Request(`${ORIGIN}${OAUTH_AUTHORIZE_PATH}`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
        body,
      }),
      oauth,
      signIn
    );
    if (result instanceof Response) jar.take(result.headers);
    else if (result.kind === 'consent') jar.take(result.headers);
    return result;
  };

  /** Back from Bluesky to wherever the sign-in was told to return. */
  const comeBack = async (extra = '') => {
    const returnTo = state.asked.at(-1)!.returnTo;
    const result = await finish(new Request(`${ORIGIN}${returnTo}${extra}`, { headers: { cookie: jar.header() } }), oauth, signIn);
    if (result instanceof Response) jar.take(result.headers);
    return result;
  };

  /** Exchange the code the assistant got, and call /mcp/me with the token. */
  const redeem = async (location: string) => {
    const code = new URL(location).searchParams.get('code')!;
    const res = await worker.fetch(
      new Request(`${ORIGIN}${OAUTH_TOKEN_PATH}`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT,
          client_id: client.clientId,
          code_verifier: VERIFIER,
          resource: `${ORIGIN}${MEMBER_MCP_PATH}`,
        }),
      }),
      env,
      ctx
    );
    expect(res.status).toBe(200);
    const token = (await res.json()) as { access_token: string; scope: string };
    seen.length = 0;
    const me = await worker.fetch(
      new Request(`${ORIGIN}${MEMBER_MCP_PATH}`, { method: 'POST', headers: { authorization: `Bearer ${token.access_token}` } }),
      env,
      ctx
    );
    expect(me.status).toBe(200);
    return { scope: token.scope.split(' ').sort(), member: memberFromContext({ props: seen[0] }) };
  };

  return { open, post, comeBack, redeem, state, oauth, signIn };
}

const location = (r: unknown) => (r instanceof Response ? (r.headers.get('location') ?? '') : '');

describe('/oauth/authorize', () => {
  it('shows who is asking and where access goes, and cannot be framed', async () => {
    const { open } = await setUp();
    const page = await open();
    expect(page.details.clientName).toBe('Test Assistant');
    expect(page.details.redirectHost).toBe('assistant.example');
    expect(page.details.clientDomain).toBeUndefined(); // self-registered: the page says unverified
    expect(page.member).toBeNull();
    expect(page.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(page.headers.getSetCookie().length).toBeGreaterThan(0);
  });

  it('lets a member signed in here allow as themselves, with logging pours if ticked', async () => {
    const t = await setUp();
    t.state.user = { did: ALICE, handle: 'alice.test', signedInAt: new Date().toISOString() };
    const page = await t.open();
    expect(page.member).toEqual({ did: ALICE, handle: 'alice.test' });

    const result = await t.post({ consent: page.consent, decision: 'allow', as: 'member', scope: MEMBER_SCOPES.write });
    expect(location(result)).toMatch(/^https:\/\/assistant\.example\/callback\?.*code=/);
    expect(new URL(location(result)).searchParams.get('state')).toBe('client-state');

    const { scope, member } = await t.redeem(location(result));
    expect(scope).toEqual([MEMBER_SCOPES.read, MEMBER_SCOPES.write].sort());
    expect(member).toEqual({ did: ALICE });
  });

  it('grants only reading when the box is unticked, whatever the assistant asked for', async () => {
    const t = await setUp();
    t.state.user = { did: ALICE, signedInAt: new Date().toISOString() };
    const page = await t.open(`${MEMBER_SCOPES.read} ${MEMBER_SCOPES.write}`);
    const result = await t.post({ consent: page.consent, decision: 'allow', as: 'member' });
    expect((await t.redeem(location(result))).scope).toEqual([MEMBER_SCOPES.read]);
  });

  it('will not allow as a member whose Bluesky session no longer restores', async () => {
    const t = await setUp();
    t.state.user = { did: ALICE, signedInAt: new Date().toISOString() };
    t.state.restorable = false;
    const page = await t.open();
    const again = await t.post({ consent: page.consent, decision: 'allow', as: 'member' });
    expect(again).toMatchObject({ kind: 'consent' });
    expect((again as ConsentPage).error).toBeTruthy();
    expect((again as ConsentPage).consent).not.toBe(page.consent);
  });

  it('signs someone in through Bluesky, then grants for whoever signed in', async () => {
    const t = await setUp();
    t.state.user = { did: ALICE, signedInAt: new Date(Date.now() - 60_000).toISOString() };
    const page = await t.open();

    const sent = await t.post({ consent: page.consent, decision: 'allow', as: 'handle', handle: 'bob.test', scope: MEMBER_SCOPES.write });
    expect(location(sent)).toBe('https://bsky.example/oauth/authorize?x=1');
    expect((sent as Response).headers.getSetCookie().some((c) => c.startsWith('bsky_auth_nonce='))).toBe(true);
    expect(t.state.asked.at(-1)).toMatchObject({ handle: 'bob.test' });
    expect(t.state.asked.at(-1)!.returnTo).toMatch(new RegExp(`^${OAUTH_CALLBACK_PATH}\\?state=`));

    // Bob signs in at Bluesky; the sign-in library sets this app's session.
    t.state.user = { did: BOB, handle: 'bob.test', signedInAt: new Date(Date.now() + 1000).toISOString() };
    const done = await t.comeBack();
    expect(location(done)).toMatch(/^https:\/\/assistant\.example\/callback\?.*code=/);
    const { member, scope } = await t.redeem(location(done));
    expect(member).toEqual({ did: BOB });
    expect(scope).toContain(MEMBER_SCOPES.write);
  });

  it('refuses at the callback when the session is not the one this sign-in made', async () => {
    const t = await setUp();
    t.state.user = { did: ALICE, signedInAt: new Date(Date.now() - 60_000).toISOString() };
    const page = await t.open();
    await t.post({ consent: page.consent, decision: 'allow', as: 'handle', handle: 'bob.test' });
    // The sign-in never finished; Alice's old session is still here.
    const done = await t.comeBack();
    const url = new URL(location(done));
    expect(url.origin + url.pathname).toBe(REDIRECT);
    expect(url.searchParams.get('error')).toBe('access_denied');
    expect(url.searchParams.has('code')).toBe(false);
  });

  it('answers access_denied when the Bluesky sign-in failed or was cancelled', async () => {
    const t = await setUp();
    const page = await t.open();
    await t.post({ consent: page.consent, decision: 'allow', as: 'handle', handle: 'bob.test' });
    t.state.user = { did: BOB, signedInAt: new Date(Date.now() + 1000).toISOString() };
    const done = await t.comeBack('&auth_error=access_denied');
    expect(new URL(location(done)).searchParams.get('error')).toBe('access_denied');
  });

  it('asks again, with a fresh consent, for a handle that does not resolve', async () => {
    const t = await setUp();
    const page = await t.open();
    const again = await t.post({ consent: page.consent, decision: 'allow', as: 'handle', handle: 'nobody.example' });
    expect(again).toMatchObject({ kind: 'consent' });
    expect((again as ConsentPage).error).toBeTruthy();
    expect((again as ConsentPage).consent).not.toBe(page.consent);
    expect((again as ConsentPage).handle).toBe('nobody.example');
  });

  it('sends Deny back to the assistant as access_denied', async () => {
    const t = await setUp();
    const page = await t.open();
    const denied = await t.post({ consent: page.consent, decision: 'deny' });
    const url = new URL(location(denied));
    expect(url.searchParams.get('error')).toBe('access_denied');
    expect(url.searchParams.get('state')).toBe('client-state');
  });

  it('refuses a consent posted from another browser, or posted twice', async () => {
    const t = await setUp();
    t.state.user = { did: ALICE, signedInAt: new Date().toISOString() };
    const page = await t.open();
    const elsewhere = await t.post({ consent: page.consent, decision: 'allow', as: 'member' }, '');
    expect(elsewhere).toMatchObject({ kind: 'refused' });

    const first = await t.post({ consent: page.consent, decision: 'allow', as: 'member' });
    expect(location(first)).toContain('code=');
    const twice = await t.post({ consent: page.consent, decision: 'allow', as: 'member' });
    expect(twice).toMatchObject({ kind: 'refused' });
  });

  it('refuses a callback whose state this browser did not start', async () => {
    const t = await setUp();
    const page = await t.open();
    await t.post({ consent: page.consent, decision: 'allow', as: 'handle', handle: 'bob.test' });
    t.state.user = { did: BOB, signedInAt: new Date(Date.now() + 1000).toISOString() };
    const returnTo = t.state.asked.at(-1)!.returnTo;
    // The same state from a browser without its binding cookie.
    expect(await finish(new Request(`${ORIGIN}${returnTo}`), t.oauth, t.signIn)).toMatchObject({ kind: 'refused' });
    // And this browser can still finish, once.
    expect(location(await t.comeBack())).toContain('code=');
  });
});

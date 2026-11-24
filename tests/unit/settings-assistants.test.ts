import { describe, expect, it } from 'vitest';
import { MEMBER_MCP_PATH, MEMBER_SCOPES, OAUTH_AUTHORIZE_PATH, OAUTH_TOKEN_PATH, oauthApi, withMemberSignIn, grantUserId, type WorkerContext } from '@/lib/mcp/member-auth';
import { disconnectAssistant, listAssistants } from '@/lib/settings/assistants.server';
import { memoryKv } from './helpers/memory-kv';

/**
 * `/settings` § Connected assistants: a member sees the assistants they let
 * act as them, and can take that back, against the real OAuth provider over
 * memory KV. A member can only ever see or revoke their own.
 */

const ORIGIN = 'https://cotidal.test';
const ALICE = 'did:plc:alice1234567890abcdefgh';
const BOB = 'did:plc:bob1234567890abcdefghij';
const VERIFIER = 'v'.repeat(64);

async function s256(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function setUp() {
  const env = { OAUTH_KV: memoryKv() };
  const oauth = oauthApi(new URL(ORIGIN), env)!;
  const worker = withMemberSignIn({ fetch: async () => new Response('ok') });
  const ctx = { waitUntil() {}, passThroughOnException() {}, props: {} } as WorkerContext;

  /** Connect an assistant for a member, as the consent page does, and return its token. */
  async function connect(did: string, clientName: string | undefined, scope: string[], redirect = 'https://assistant.example/cb') {
    const client = await oauth.createClient({ redirectUris: [redirect], tokenEndpointAuthMethod: 'none', ...(clientName ? { clientName } : {}) });
    const request = await oauth.parseAuthRequest(
      new Request(
        `${ORIGIN}${OAUTH_AUTHORIZE_PATH}?${new URLSearchParams({
          response_type: 'code',
          client_id: client.clientId,
          redirect_uri: redirect,
          scope: scope.join(' '),
          state: 's',
          code_challenge: await s256(VERIFIER),
          code_challenge_method: 'S256',
          resource: `${ORIGIN}${MEMBER_MCP_PATH}`,
        })}`
      )
    );
    const { redirectTo } = await oauth.completeAuthorization({ request, userId: grantUserId(did), metadata: {}, scope, props: { did } });
    const res = await worker.fetch(
      new Request(`${ORIGIN}${OAUTH_TOKEN_PATH}`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: new URL(redirectTo).searchParams.get('code')!,
          redirect_uri: redirect,
          client_id: client.clientId,
          code_verifier: VERIFIER,
          resource: `${ORIGIN}${MEMBER_MCP_PATH}`,
        }),
      }),
      env,
      ctx
    );
    return ((await res.json()) as { access_token: string }).access_token;
  }

  const call = (token: string) =>
    worker.fetch(new Request(`${ORIGIN}${MEMBER_MCP_PATH}`, { method: 'POST', headers: { authorization: `Bearer ${token}` } }), env, ctx);

  return { oauth, connect, call };
}

describe('connected assistants', () => {
  it('lists a member’s own assistants, newest first, with what each may do', async () => {
    const t = await setUp();
    await t.connect(ALICE, 'Claude', [MEMBER_SCOPES.read, MEMBER_SCOPES.write]);
    await t.connect(ALICE, undefined, [MEMBER_SCOPES.read], 'https://other.example/cb');
    await t.connect(BOB, 'Bob’s assistant', [MEMBER_SCOPES.read]);

    const alice = await listAssistants(t.oauth, ALICE);
    expect(alice).toHaveLength(2);
    const claude = alice.find((a) => a.name === 'Claude')!;
    expect(claude).toMatchObject({ canLog: true, domain: null, redirectHost: 'assistant.example' });
    const unnamed = alice.find((a) => a.name === null)!;
    expect(unnamed).toMatchObject({ canLog: false, redirectHost: 'other.example' });
    expect(Math.abs(claude.connectedAt.getTime() - Date.now())).toBeLessThan(60_000);
    expect(alice.map((a) => a.name)).not.toContain('Bob’s assistant');
  });

  it('disconnecting stops the assistant at once', async () => {
    const t = await setUp();
    const token = await t.connect(ALICE, 'Claude', [MEMBER_SCOPES.read]);
    expect((await t.call(token)).status).toBe(200);

    const [claude] = await listAssistants(t.oauth, ALICE);
    await disconnectAssistant(t.oauth, ALICE, claude.grantId);
    expect(await listAssistants(t.oauth, ALICE)).toEqual([]);
    expect((await t.call(token)).status).toBe(401);
  });

  it('cannot disconnect another member’s assistant', async () => {
    const t = await setUp();
    const token = await t.connect(BOB, 'Bob’s assistant', [MEMBER_SCOPES.read]);
    const [bobs] = await listAssistants(t.oauth, BOB);

    await disconnectAssistant(t.oauth, ALICE, bobs.grantId).catch(() => {});
    expect(await listAssistants(t.oauth, BOB)).toHaveLength(1);
    expect((await t.call(token)).status).toBe(200);
  });

  it('does nothing for an empty grant id', async () => {
    const t = await setUp();
    await t.connect(ALICE, 'Claude', [MEMBER_SCOPES.read]);
    await disconnectAssistant(t.oauth, ALICE, '');
    expect(await listAssistants(t.oauth, ALICE)).toHaveLength(1);
  });
});

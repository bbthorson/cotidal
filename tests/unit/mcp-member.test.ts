import { describe, expect, it } from 'vitest';
import type { AuthStore } from '@bbthorson/atproto-cf-auth/server';
import { logMemberPour, myPours, type MemberTools, type ToolContext } from '@/lib/mcp/tools';
import { WRITE_TOOLS } from '@/lib/mcp/server';
import { serveMcp } from '@/lib/mcp/serve';
import { callsTool } from '@/lib/mcp/member-auth';
import { answerMember } from '@/lib/mcp/member-endpoint';
import { movingStore } from '@/lib/atproto/moving-store';
import { readPrivateKeys } from '@/lib/atproto/auth';
import { hedonicToRating } from '@/lib/pour-entry';
import type { LogDrinkOptions } from '@/lib/api-client';
import type { PourRecord } from '@/lib/atproto/records';
import { pour as pourCopy } from '@/lib/copy';

/**
 * `/mcp/me`: the tools as one member. The member's session is a stand-in
 * that records what would be written; `logPour` itself is covered by
 * log-pour.test.ts.
 */

const DID = 'did:plc:member1234567890abcdef';
const none = { smoke: false, bitter: false, anise: false };

function member(opts: { gone?: boolean; pours?: PourRecord[] } = {}) {
  const written: Partial<LogDrinkOptions>[] = [];
  const tools: MemberTools = {
    did: DID,
    recentPours: async (limit) => (opts.gone ? null : (opts.pours ?? []).slice(0, limit)),
    logPour: async (options) => {
      if (opts.gone) return null;
      written.push(options);
      return {
        ok: true,
        uri: `at://${DID}/app.cotidal.pour/1`,
        profile: { x: 1.5, y: -2, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false, vibeTags: {} },
      };
    },
  };
  return { tools, written };
}

function context(tools?: MemberTools): ToolContext {
  return {
    readPalate: async (actor) =>
      actor === DID
        ? { status: 'ok', actor: { did: DID, handle: 'me.test' }, palate: { x: 2, y: 3, aversions: none, pours: 1, updatedAt: null } }
        : { status: 'not-found' },
    register: {},
    origin: 'https://cotidal.test',
    ...(tools ? { member: tools } : {}),
  };
}

const pourRecord = (over: Partial<PourRecord> = {}): PourRecord => ({
  $type: 'app.cotidal.pour',
  drink: { name: 'Negroni' },
  rating: { hedonic: 8 },
  createdAt: '2026-11-20T20:00:00.000Z',
  ...over,
}) as PourRecord;

async function rpc(ctx: ToolContext, method: string, params: unknown = {}) {
  const res = await serveMcp(
    new Request('https://cotidal.test/mcp/me', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    }),
    ctx
  );
  return (await res.json()) as { result?: Record<string, unknown>; error?: unknown };
}

describe('log_pour', () => {
  it('writes the rating they gave, on the form’s own scale', async () => {
    const { tools, written } = member();
    const result = await logMemberPour({ drink: 'negroni', hedonic: 8, bar: 'The Bar' }, context(tools));
    expect(result.ok).toBe(true);
    expect(written).toHaveLength(1);
    expect(written[0].rating).toBe(hedonicToRating(8));
    // The same mapping logPour applies, so the stored point is the one given.
    expect(Math.round(written[0].rating! * 0.8 + 1)).toBe(8);
    expect(written[0].drinkName).toBe('Negroni');
    expect(written[0].venue).toEqual({ name: 'The Bar' });
    if (result.ok) {
      expect(result.data.logged.liked).toBe(pourCopy.hedonic[7]);
      expect(result.data.coordinate).toBeTruthy();
    }
  });

  it('writes only what they said: no bar at home, known ids only, no guessed reorder', async () => {
    const { tools, written } = member();
    await logMemberPour(
      { drink: 'Daiquiri', hedonic: 6, atHome: true, bar: 'Ignored', whatWasOff: ['too-sweet', 'made-up'], notes: ['bright-citrus'] },
      context(tools)
    );
    expect(written[0].isHomePour).toBe(true);
    expect(written[0].venue).toBeUndefined();
    expect(written[0].deviations).toEqual(['too-sweet']);
    expect(written[0].cata).toEqual(['bright-citrus']);
    expect('wouldOrderAgain' in written[0]).toBe(false);
    expect('crosspostToFeed' in written[0]).toBe(false);
  });

  it('refuses a missing or out-of-range rating without writing', async () => {
    const { tools, written } = member();
    for (const hedonic of [0, 10, 4.5, Number.NaN]) {
      expect((await logMemberPour({ drink: 'Negroni', hedonic }, context(tools))).ok).toBe(false);
    }
    expect(written).toEqual([]);
  });

  it('says so when the member’s session is gone, and writes nothing', async () => {
    const { tools } = member({ gone: true });
    const result = await logMemberPour({ drink: 'Negroni', hedonic: 7 }, context(tools));
    expect(result.ok).toBe(false);
  });

  it('exists only at /mcp/me', async () => {
    expect((await logMemberPour({ drink: 'Negroni', hedonic: 7 }, context())).ok).toBe(false);
  });
});

describe('my_pours', () => {
  it('reads the member’s own log, newest first as given, in the form’s words', async () => {
    const { tools } = member({
      pours: [
        pourRecord({ isHomePour: true }),
        pourRecord({ drink: { name: 'Martini' }, rating: { hedonic: 3, wouldOrderAgain: false }, venue: { entity: { name: 'Corner' } } as PourRecord['venue'] }),
      ],
    });
    const result = await myPours(undefined, context(tools));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.pours.map((p) => p.drink)).toEqual(['Negroni', 'Martini']);
    expect(result.data.pours[0]).toMatchObject({ atHome: true, where: null, liked: pourCopy.hedonic[7] });
    expect(result.data.pours[1]).toMatchObject({ where: 'Corner', wouldOrderAgain: false });
  });

  it('exists only at /mcp/me', async () => {
    expect((await myPours(5, context())).ok).toBe(false);
  });
});

describe('the member’s server', () => {
  it('adds my_pours and log_pour, and makes the handle optional, only for a member', async () => {
    const publicTools = (await rpc(context(), 'tools/list')).result!.tools as { name: string; inputSchema: { required?: string[] } }[];
    const memberTools = (await rpc(context(member().tools), 'tools/list')).result!.tools as typeof publicTools;
    expect(publicTools.map((t) => t.name)).not.toContain('log_pour');
    expect(memberTools.map((t) => t.name)).toEqual(expect.arrayContaining(['my_pours', 'log_pour']));
    expect(publicTools.find((t) => t.name === 'get_palate')!.inputSchema.required).toContain('handle');
    expect(memberTools.find((t) => t.name === 'get_palate')!.inputSchema.required ?? []).not.toContain('handle');
    expect(memberTools.find((t) => t.name === 'log_pour')!.inputSchema.required).toEqual(expect.arrayContaining(['drink', 'hedonic']));
  });

  it('reads the member’s own palate when the handle is left out', async () => {
    const res = await rpc(context(member().tools), 'tools/call', { name: 'get_palate', arguments: {} });
    expect((res.result as { structuredContent: { did: string } }).structuredContent.did).toBe(DID);
  });
});

describe('callsTool', () => {
  const post = (body: unknown) =>
    new Request('https://cotidal.test/mcp/me', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) });

  it('finds a write call, alone or in a batch, and nothing else', async () => {
    const call = (name: string) => ({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: {} } });
    expect(await callsTool(post(call('log_pour')), WRITE_TOOLS)).toBe(true);
    expect(await callsTool(post([call('get_palate'), call('log_pour')]), WRITE_TOOLS)).toBe(true);
    expect(await callsTool(post(call('get_palate')), WRITE_TOOLS)).toBe(false);
    expect(await callsTool(post({ jsonrpc: '2.0', id: 1, method: 'tools/list' }), WRITE_TOOLS)).toBe(false);
    expect(await callsTool(post('not json'), WRITE_TOOLS)).toBe(false);
    expect(await callsTool(new Request('https://cotidal.test/mcp/me'), WRITE_TOOLS)).toBe(false);
  });

  it('leaves the body for the transport to read', async () => {
    const req = post({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'log_pour' } });
    await callsTool(req, WRITE_TOOLS);
    expect(await req.json()).toMatchObject({ method: 'tools/call' });
  });
});

describe('movingStore', () => {
  const store = () => {
    const data = new Map<string, string>();
    const s: AuthStore & { data: Map<string, string> } = {
      data,
      get: async (k) => data.get(k),
      set: async (k, v) => void data.set(k, v),
      delete: async (k) => void data.delete(k),
    };
    return s;
  };

  it('reads a session from the old store once, and keeps it in the new one', async () => {
    const next = store();
    const previous = store();
    previous.data.set('sid:1', 'sealed');
    const moving = movingStore(next, previous, 60);
    expect(await moving.get('sid:1')).toBe('sealed');
    expect(next.data.get('sid:1')).toBe('sealed');
    expect(await moving.get('missing')).toBeUndefined();
  });

  it('writes only to the new store, and deletes from both', async () => {
    const next = store();
    const previous = store();
    previous.data.set('oauth:did', 'old');
    const moving = movingStore(next, previous, 60);
    await moving.set('oauth:did', 'new', 60);
    expect(next.data.get('oauth:did')).toBe('new');
    expect(previous.data.get('oauth:did')).toBe('old');
    expect(await moving.get('oauth:did')).toBe('new');
    await moving.delete('oauth:did');
    expect(next.data.has('oauth:did')).toBe(false);
    expect(previous.data.has('oauth:did')).toBe(false);
  });
});

describe('readPrivateKeys', () => {
  const jwk = { kty: 'EC', crv: 'P-256', x: 'x', y: 'y', d: 'd', kid: 'k1' };

  it('reads one key, or several to rotate, and none for a public client', () => {
    expect(readPrivateKeys({ OAUTH_PRIVATE_KEY: JSON.stringify(jwk) })).toEqual([jwk]);
    expect(readPrivateKeys({ OAUTH_PRIVATE_KEYS: JSON.stringify([jwk, { ...jwk, kid: 'k0' }]) })).toHaveLength(2);
    expect(readPrivateKeys({})).toBeUndefined();
    expect(readPrivateKeys(undefined)).toBeUndefined();
  });

  it('refuses a key without a kid', () => {
    expect(() => readPrivateKeys({ OAUTH_PRIVATE_KEY: JSON.stringify({ ...jwk, kid: undefined }) })).toThrow();
  });
});

describe('/mcp/me', () => {
  const auth = (scope: string[]) => ({ token: 't', audience: 'https://cotidal.test/mcp/me', scope, userId: 'u' });
  const call = (name: string, args: Record<string, unknown> = {}) =>
    new Request('https://cotidal.test/mcp/me', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }),
    });
  const base = context();

  it('does not exist without a member from the provider', async () => {
    expect((await answerMember(call('get_palate'), undefined, base, () => member().tools)).status).toBe(404);
    expect((await answerMember(call('get_palate'), { props: { did: DID } }, base, () => member().tools)).status).toBe(404);
  });

  it('asks for the wider grant before a write runs on a read-only token', async () => {
    const { tools, written } = member();
    const res = await answerMember(call('log_pour', { drink: 'Negroni', hedonic: 7 }), { props: { did: DID }, auth: auth(['palate:read']) }, base, () => tools);
    expect(res.status).toBe(403);
    const challenge = res.headers.get('www-authenticate') ?? '';
    expect(challenge).toContain('insufficient_scope');
    expect(challenge).toContain('palate:read pours:write');
    expect(written).toEqual([]);
  });

  it('reads on a read-only token, and writes on a write token, as the grant’s member', async () => {
    const { tools, written } = member();
    let asked = '';
    const build = (did: string) => ((asked = did), tools);
    const read = await answerMember(call('get_palate'), { props: { did: DID }, auth: auth(['palate:read']) }, base, build);
    expect(read.status).toBe(200);
    const write = await answerMember(
      call('log_pour', { drink: 'Negroni', hedonic: 7 }),
      { props: { did: DID }, auth: auth(['palate:read', 'pours:write']) },
      base,
      build
    );
    expect(write.status).toBe(200);
    expect(asked).toBe(DID);
    expect(written).toHaveLength(1);
  });
});

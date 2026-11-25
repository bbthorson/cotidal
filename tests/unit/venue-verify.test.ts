import { describe, expect, it } from 'vitest';
import { domainMatchesHandle, normalizeDomain, verifyVenueDomain } from '@/lib/atproto/venue-verify';

const DID = 'did:plc:bar111111111111111111111';
const OTHER_DID = 'did:plc:other2222222222222222222';

function fakeResolver(map: Record<string, string>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url);
    if (url.pathname === '/xrpc/com.atproto.identity.resolveHandle') {
      const handle = url.searchParams.get('handle') ?? '';
      if (handle in map) {
        return new Response(JSON.stringify({ did: map[handle] }), { status: 200 });
      }
      return new Response('{}', { status: 400 });
    }
    return new Response('{}', { status: 404 });
  }) as typeof fetch;
}

describe('venue-verify', () => {
  it('normalises bare domains from http(s) URLs', () => {
    expect(normalizeDomain('https://www.Attaboy.nyc/menu?x=1')).toBe('attaboy.nyc');
    expect(normalizeDomain('http://deathandco.com.')).toBe('deathandco.com');
    expect(normalizeDomain('ftp://attaboy.nyc')).toBeNull();
    expect(normalizeDomain('not a url')).toBeNull();
    expect(normalizeDomain('https://localhost')).toBeNull();
  });

  it('matches website URL domains against verified handles', () => {
    expect(domainMatchesHandle('https://www.attaboy.nyc/drinks', 'attaboy.nyc')).toBe(true);
    expect(domainMatchesHandle('https://attaboy.nyc', '@attaboy.nyc')).toBe(true);
    expect(domainMatchesHandle('https://attaboy.nyc', 'attaboy.bsky.social')).toBe(false);
    expect(domainMatchesHandle(null, 'attaboy.nyc')).toBe(false);
  });

  it('verifies immediately when the signed-in handle already matches the URL domain', async () => {
    let called = false;
    const res = await verifyVenueDomain('https://www.attaboy.nyc', DID, 'attaboy.nyc', {
      fetch: (async () => {
        called = true;
        return new Response('{}', { status: 500 });
      }) as typeof fetch,
    });
    expect(res).toEqual({ ok: true, domain: 'attaboy.nyc' });
    expect(called).toBe(false);
  });

  it('resolves the URL domain to confirm it points at the claiming DID', async () => {
    const ok = await verifyVenueDomain('https://attaboy.nyc', DID, 'attaboy.bsky.social', {
      fetch: fakeResolver({ 'attaboy.nyc': DID }),
    });
    expect(ok).toEqual({ ok: true, domain: 'attaboy.nyc' });

    const wrongDid = await verifyVenueDomain('https://attaboy.nyc', DID, 'attaboy.bsky.social', {
      fetch: fakeResolver({ 'attaboy.nyc': OTHER_DID }),
    });
    expect(wrongDid).toEqual({ ok: false, domain: 'attaboy.nyc', reason: 'mismatch' });

    const unresolved = await verifyVenueDomain('https://unclaimed.nyc', DID, 'attaboy.bsky.social', {
      fetch: fakeResolver({}),
    });
    expect(unresolved).toEqual({ ok: false, domain: 'unclaimed.nyc', reason: 'mismatch' });
  });

  it('rejects invalid URLs without making network calls', async () => {
    const res = await verifyVenueDomain('javascript:alert(1)', DID, 'attaboy.nyc');
    expect(res).toEqual({ ok: false, domain: null, reason: 'invalid-url' });
  });
});

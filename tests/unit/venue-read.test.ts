import { describe, expect, it } from 'vitest';
import { readPublicVenue } from '@/lib/atproto/venue-read';

const DID = 'did:plc:bar111111111111111111111';
const HANDLE = 'attaboy.nyc';
const PDS = 'https://pds.bar.example';

function fakeFetch(records: Record<string, unknown>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url);
    if (url.pathname === '/xrpc/com.atproto.identity.resolveHandle') {
      if (url.searchParams.get('handle') === HANDLE) {
        return new Response(JSON.stringify({ did: DID }), { status: 200 });
      }
      return new Response('{}', { status: 400 });
    }
    if (url.hostname === 'plc.directory' && url.pathname === `/${DID}`) {
      return new Response(
        JSON.stringify({
          id: DID,
          alsoKnownAs: [`at://${HANDLE}`],
          service: [{ id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: PDS }],
        }),
        { status: 200 }
      );
    }
    if (url.pathname === '/xrpc/com.atproto.repo.getRecord') {
      const key = `${url.searchParams.get('collection')}/${url.searchParams.get('rkey')}`;
      if (key in records) {
        return new Response(JSON.stringify({ value: records[key] }), { status: 200 });
      }
      return new Response('{}', { status: 400 });
    }
    return new Response('{}', { status: 404 });
  }) as typeof fetch;
}

describe('readPublicVenue', () => {
  it('reads a venue record and resolves its currentMenu with placed coordinates', async () => {
    const fetchImpl = fakeFetch({
      'app.cotidal.venue/self': {
        name: 'Attaboy',
        description: 'No menu, just tell us what you like.',
        website: 'https://attaboy.nyc',
        currentMenu: { uri: `at://${DID}/app.cotidal.menu/3k2a` },
        createdAt: '2026-11-01T00:00:00.000Z',
      },
      'app.cotidal.menu/3k2a': {
        title: 'House Classics',
        publishedAt: '2026-11-01T00:00:00.000Z',
        sections: [
          {
            name: 'Originals',
            items: [
              { drink: { name: 'Paper Plane' }, description: 'bourbon, Aperol, Amaro Nonino, lemon' },
              { drink: { name: 'House Secret' }, description: 'gin, chartreuse, lime' },
            ],
          },
        ],
      },
    });

    const result = await readPublicVenue(HANDLE, { fetch: fetchImpl });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.venue.name).toBe('Attaboy');
    expect(result.venue.domainVerified).toBe(true);
    expect(result.venue.menu?.title).toBe('House Classics');
    expect(result.venue.menu?.sections[0].items[0].placed?.name).toBe('Paper Plane');
    expect(result.venue.menu?.sections[0].items[1].placed).toBeNull();
  });

  it('returns no-venue when the account has not published a venue record', async () => {
    const result = await readPublicVenue(HANDLE, { fetch: fakeFetch({}) });
    expect(result.status).toBe('no-venue');
  });

  it('refuses reserved TLDs before any network call', async () => {
    let called = false;
    const result = await readPublicVenue('bar.invalid', {
      fetch: (async () => {
        called = true;
        return new Response('{}', { status: 500 });
      }) as typeof fetch,
    });
    expect(result.status).toBe('invalid');
    expect(called).toBe(false);
  });
});

import { describe, test, expect } from 'vitest';
import { parseActor, readPublicPalate } from '../../src/lib/atproto/public-read';
import { publicMapPath } from '../../src/lib/atproto/paths';
import { compareTerrains, REACH_FOR, TOP } from '../../src/lib/palate/overlap';
import { buildTerrain, drinkHeight } from '../../src/lib/palate/terrain';
import { drinkDatabase } from '../../src/lib/drinks/data';

/**
 * `/p/<handle>`: someone's coordinate at a public URL.
 *
 * The lookups (handle → DID → document → record) are tested against a fake
 * `fetch`, so the suite needs no network. The route itself is tested only on
 * the paths that resolve offline: a reserved TLD never reaches the network.
 */

const DID = 'did:plc:abcdefghijklmnopqrstuvwx';
const PDS = 'https://pds.example.com';

type Route = (url: URL) => { status: number; body?: unknown } | undefined;

function fakeFetch(route: Route): { fetch: typeof fetch; calls: string[] } {
  const calls: string[] = [];
  const impl = (async (input: string | URL | Request) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    calls.push(url.href);
    const answer = route(url) ?? { status: 404 };
    return new Response(answer.body === undefined ? '' : JSON.stringify(answer.body), {
      status: answer.status,
    });
  }) as typeof fetch;
  return { fetch: impl, calls };
}

const didDoc = (handle = 'alice.bsky.social', endpoint = PDS) => ({
  id: DID,
  alsoKnownAs: [`at://${handle}`],
  service: [{ id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: endpoint }],
});

const palate = {
  $type: 'app.cotidal.palate',
  mapCoordinates: { xHundredths: -420, yHundredths: -310 },
  aversions: { smoke: true, bitter: false, anise: false },
  dynamicState: { latentVectorHundredths: [0, 0, 0, 0, 0], covarianceDiagonalHundredths: [100, 100, 100, 100, 100], eventCount: 3 },
  createdAt: '2026-10-01T00:00:00.000Z',
};

/** A world where alice.bsky.social exists, has a PDS and (optionally) a palate. */
const world = (opts: { record?: unknown; doc?: unknown } = {}): Route => (url) => {
  if (url.pathname === '/xrpc/com.atproto.identity.resolveHandle') {
    return url.searchParams.get('handle') === 'alice.bsky.social'
      ? { status: 200, body: { did: DID } }
      : { status: 400, body: { error: 'InvalidRequest' } };
  }
  if (url.href === `https://plc.directory/${DID}`) return { status: 200, body: opts.doc ?? didDoc() };
  if (url.origin === PDS && url.pathname === '/xrpc/com.atproto.repo.getRecord') {
    return opts.record === undefined
      ? { status: 400, body: { error: 'RecordNotFound' } }
      : { status: 200, body: { uri: 'at://x', value: opts.record } };
  }
  return undefined;
};

test('Public map: actors parse like the sign-in form, and reserved TLDs never resolve', () => {
  expect(parseActor('@Alice.bsky.social')).toBe('alice.bsky.social');
  expect(parseActor('alice')).toBe('alice.bsky.social');
  expect(parseActor(DID)).toBe(DID);
  expect(parseActor('nobody.invalid')).toBeNull();
  expect(parseActor('host.localhost')).toBeNull();
  expect(parseActor('not a handle')).toBeNull();
  expect(parseActor('%E0%A4%A')).toBeNull();
  expect(publicMapPath(DID)).toBe(`/p/${DID}`);
});

test('Public map: a handle resolves through its DID document to the palate record', async () => {
  const { fetch, calls } = fakeFetch(world({ record: palate }));
  const result = await readPublicPalate('alice.bsky.social', { fetch, handleResolver: 'https://resolver.example.com' });

  expect(result.status).toBe('ok');
  if (result.status !== 'ok') return;
  expect(result.actor).toEqual({ did: DID, handle: 'alice.bsky.social' });
  expect(result.palate).toMatchObject({ x: -4.2, y: -3.1, pours: 3 });
  expect(result.palate.aversions.smoke).toBe(true);
  expect(calls.some((c) => c.includes('collection=app.cotidal.palate') && c.includes('rkey=self'))).toBe(true);
});

test('Public map: only the current collection is asked for, and a record with floats is not a palate', async () => {
  const asked: string[] = [];
  const result = await readPublicPalate('alice.bsky.social', {
    fetch: fakeFetch((url) => {
      if (url.pathname === '/xrpc/com.atproto.repo.getRecord') asked.push(url.searchParams.get('collection')!);
      return world({ record: palate })(url);
    }).fetch,
    handleResolver: 'https://resolver.example.com',
  });
  expect(result.status).toBe('ok');
  expect(asked).toEqual(['app.cotidal.palate']);

  const floats = { ...palate, mapCoordinates: { x: -4.2, y: -3.1 } };
  const read = await readPublicPalate('alice.bsky.social', {
    fetch: fakeFetch(world({ record: floats })).fetch,
    handleResolver: 'https://resolver.example.com',
  });
  expect(read.status).toBe('no-palate');
});

test('Public map: a DID shows its handle only when the handle resolves back', async () => {
  const confirmed = await readPublicPalate(DID, {
    fetch: fakeFetch(world({ record: palate })).fetch,
    handleResolver: 'https://resolver.example.com',
  });
  expect(confirmed.status === 'ok' && confirmed.actor.handle).toBe('alice.bsky.social');

  // The document claims a handle that points somewhere else.
  const unconfirmed = await readPublicPalate(DID, {
    fetch: fakeFetch(world({ record: palate, doc: didDoc('mallory.bsky.social') })).fetch,
    handleResolver: 'https://resolver.example.com',
  });
  expect(unconfirmed.status).toBe('ok');
  expect(unconfirmed.status === 'ok' && unconfirmed.actor.handle).toBeNull();
});

test('Public map: every failure is a status, never a throw', async () => {
  const opts = (route: Route) => ({ fetch: fakeFetch(route).fetch, handleResolver: 'https://resolver.example.com' });

  expect((await readPublicPalate('nobody.invalid', opts(world()))).status).toBe('invalid');
  expect((await readPublicPalate('bob.bsky.social', opts(world()))).status).toBe('not-found');
  expect((await readPublicPalate('alice.bsky.social', opts(world()))).status).toBe('no-palate');

  // A record that is not a palate the page can draw.
  const offMap = { ...palate, mapCoordinates: { xHundredths: 4000, yHundredths: 0 } };
  expect((await readPublicPalate('alice.bsky.social', opts(world({ record: offMap })))).status).toBe('no-palate');

  // A document pointing its PDS at a host the server must not fetch.
  for (const endpoint of ['http://pds.example.com', 'https://127.0.0.1', 'https://localhost:2583']) {
    const r = await readPublicPalate('alice.bsky.social', opts(world({ record: palate, doc: didDoc('alice.bsky.social', endpoint) })));
    expect(r.status, endpoint).toBe('not-found');
  }

  // The network itself failing.
  const down = (async () => {
    throw new TypeError('network down');
  }) as typeof fetch;
  const unavailable = await readPublicPalate('alice.bsky.social', { fetch: down, handleResolver: 'https://resolver.example.com' });
  expect(unavailable.status).toBe('unavailable');
});

describe('Overlap of two tastes as ground (compareTerrains)', () => {
  const none = { smoke: false, bitter: false, anise: false };
  const pours = (list: [string, number][]) => list.map(([name, hedonic]) => ({ drink: { name }, rating: { hedonic } }));
  const deep = buildTerrain({ x: -6, y: -6, variance: { x: 2, y: 2 } }, pours([['Manhattan', 9], ['Old Fashioned', 9]]));
  const surf = buildTerrain({ x: 6, y: 5, variance: { x: 2, y: 2 } }, pours([['Daiquiri (Classic)', 9], ['Mojito', 9]]));
  const byName = (n: string) => drinkDatabase.find((d) => d.name === n)!;

  test('leads with what each would reach for that the other would not, from their own ground', () => {
    const o = compareTerrains({ terrain: deep, aversions: none }, { terrain: surf, aversions: none });
    expect(o.firstOnly).not.toBeNull();
    expect(o.secondOnly).not.toBeNull();
    expect(o.firstOnly!.x).toBeLessThan(0);
    expect(o.secondOnly!.x).toBeGreaterThan(0);
    expect(drinkHeight(deep, o.firstOnly!).rating).toBeGreaterThan(drinkHeight(surf, o.firstOnly!).rating);
    expect(o.inCommon).toBeLessThan(TOP);
  });

  test('two people who part ways share nothing invented: no drink "for both" that neither would reach for', () => {
    const o = compareTerrains({ terrain: deep, aversions: none }, { terrain: surf, aversions: none });
    if (o.shared) {
      expect(drinkHeight(deep, o.shared).rating).toBeGreaterThanOrEqual(REACH_FOR);
      expect(drinkHeight(surf, o.shared).rating).toBeGreaterThanOrEqual(REACH_FOR);
    }
    expect(o.shared).toBeNull();
  });

  test('two people with the same taste get no invented contrast, and every top drink in common', () => {
    const o = compareTerrains({ terrain: deep, aversions: none }, { terrain: deep, aversions: none });
    expect(o.firstOnly).toBeNull();
    expect(o.secondOnly).toBeNull();
    expect(o.shared).not.toBeNull();
    expect(o.inCommon).toBe(TOP);
  });

  test('a drink either avoids is never the one they share, nor offered to the one who avoids it', () => {
    const smoke = { ...none, smoke: true };
    const o = compareTerrains({ terrain: deep, aversions: smoke }, { terrain: deep, aversions: none });
    expect(o.shared?.hasSmoke).toBeFalsy();
    expect(o.firstOnly?.hasSmoke).toBeFalsy();
    expect(byName('Manhattan')).toBeDefined();
  });
});

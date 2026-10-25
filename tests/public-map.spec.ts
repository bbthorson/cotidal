import { test, expect } from '@playwright/test';
import { parseActor, readPublicPalate } from '../src/lib/atproto/public-read';
import { publicMapPath } from '../src/lib/atproto/paths';
import { compareMaps, describeDistance, nearestDrinks, MAX_DISTANCE } from '../src/lib/overlap';
import { distanceBands, publicMap } from '../src/lib/copy';
import type { Drink } from '../src/lib/data';

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
  $type: 'app.crystalcoupe.palate',
  mapCoordinates: { x: -4.2, y: -3.1 },
  aversions: { smoke: true, bitter: false, anise: false },
  dynamicState: { latentVector: [0, 0, 0, 0, 0], covarianceDiagonal: [1, 1, 1, 1, 1], eventCount: 3 },
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
  expect(calls.some((c) => c.includes('collection=app.crystalcoupe.palate') && c.includes('rkey=self'))).toBe(true);
});

test('Public map: a record in the hundredths encoding reads the same as a legacy one', async () => {
  // The fixture above is a legacy float record; this is the same palate as
  // written now, coordinates in integer hundredths.
  const current = {
    ...palate,
    mapCoordinates: { xHundredths: -420, yHundredths: -310 },
    dynamicState: { latentVectorHundredths: [0, 0, 0, 0, 0], covarianceDiagonalHundredths: [100, 100, 100, 100, 100], eventCount: 3 },
  };
  const { fetch } = fakeFetch(world({ record: current }));
  const result = await readPublicPalate('alice.bsky.social', { fetch, handleResolver: 'https://resolver.example.com' });
  expect(result.status).toBe('ok');
  if (result.status !== 'ok') return;
  expect(result.palate).toMatchObject({ x: -4.2, y: -3.1, pours: 3 });
  expect(result.palate.aversions.smoke).toBe(true);
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
  const offMap = { ...palate, mapCoordinates: { x: 40, y: 0 } };
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

const drink = (name: string, x: number, y: number, flags: Partial<Drink> = {}): Drink => ({
  name,
  type: 'Cocktail',
  x,
  y,
  hasSmoke: false,
  hasAnise: false,
  isBitter: false,
  tags: [],
  ...flags,
});
const none = { smoke: false, bitter: false, anise: false };

test('Overlap: leads with what each would order that the other would not', () => {
  const drinks = [
    drink('Negroni', -6, -6),
    drink('Daiquiri', 6, 6),
    drink('Martini', 0, 0),
    drink('Smoky Thing', -1, 0, { hasSmoke: true }),
  ];
  const subject = { x: -6, y: -6, aversions: none };
  const viewer = { x: 6, y: 6, aversions: { ...none, smoke: true } };
  const overlap = compareMaps(subject, viewer, drinks);

  expect(overlap.theirs?.name).toBe('Negroni');
  expect(overlap.yours?.name).toBe('Daiquiri');
  // Nearest the midpoint that neither's aversions rule out.
  expect(overlap.shared?.name).toBe('Martini');
  expect(overlap.distance).toBeCloseTo(Math.hypot(12, 12));
  expect(overlap.description).toBe(describeDistance(overlap.distance));
});

test('Overlap: two people in the same spot get no invented contrast', () => {
  const drinks = [drink('A', 1, 1), drink('B', 2, 2)];
  const here = { x: 1, y: 1, aversions: none };
  const overlap = compareMaps(here, here, drinks);
  expect(overlap.theirs).toBeNull();
  expect(overlap.yours).toBeNull();
  expect(overlap.shared?.name).toBe('A');
  expect(overlap.description).toBe(distanceBands[0].text);
});

test('Overlap: distance bands cover the whole map, nearest drinks respect aversions', () => {
  expect(describeDistance(MAX_DISTANCE)).toBe(distanceBands[distanceBands.length - 1].text);
  for (let i = 1; i < distanceBands.length; i++) {
    expect(distanceBands[i].under).toBeGreaterThan(distanceBands[i - 1].under);
  }
  const near = nearestDrinks({ x: 0, y: 0, aversions: { ...none, bitter: true } }, 2, [
    drink('Bitter', 0, 0, { isBitter: true }),
    drink('Close', 1, 0),
    drink('Far', 5, 5),
  ]);
  expect(near.map((d) => d.name)).toEqual(['Close', 'Far']);
});

test('Public map route: an unknown actor is a 404 page, not an error', async ({ request }) => {
  const res = await request.get('/p/nobody.invalid');
  expect(res.status()).toBe(404);
  const html = await res.text();
  expect(html).toContain(publicMap.notFoundTitle);
  expect(html).toContain('href="/taste"');
  expect(html).toContain('aria-label="Main Navigation"');
});

test('Public map route: ships no client JavaScript', async ({ page }) => {
  const scripts: string[] = [];
  page.on('response', (res) => {
    if (res.request().resourceType() !== 'script') return;
    const url = res.url();
    if (/\/@vite\/|\/@id\/|\/dev-toolbar\/|\/node_modules\//.test(url) || url.endsWith('.css')) return;
    scripts.push(url);
  });
  await page.goto('/p/nobody.invalid', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(publicMap.notFoundTitle);
  expect(scripts, `unexpected scripts: ${scripts.join(', ')}`).toHaveLength(0);
  expect(await page.locator('astro-island').count()).toBe(0);
});

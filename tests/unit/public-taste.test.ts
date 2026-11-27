import { describe, expect, test } from 'vitest';
import { resolvePublicRepo, readPublicPalate } from '../../src/lib/atproto/public-read';
import { MAX_POURS, readPublicTaste, type TasteCache } from '../../src/lib/atproto/public-taste';
import { createInitialBelief, answerQuestion } from '../../src/lib/palate/belief-state';
import { selectNextQuestion } from '../../src/lib/palate/question-selector';
import { toElicitationRecord } from '../../src/lib/palate/elicitation';
import { quizStart } from '../../src/lib/palate/track';
import { buildTerrain, drinkHeight } from '../../src/lib/palate/terrain';
import { drinkDatabase } from '../../src/lib/drinks/data';

/**
 * Someone's taste from their public records (`public-taste.ts`): their
 * latest questions and their pours, read with no session, cached by the
 * repository's revision. Tested against a fake network.
 */

const DID = 'did:plc:abcdefghijklmnopqrstuvwx';
const PDS = 'https://pds.example.com';
const REV = '3l3qo2vutsw2b';

function quizRecord() {
  let belief = createInitialBelief();
  const asked = new Set<string>();
  for (let i = 0; i < 6; i++) {
    const q = selectNextQuestion(belief, asked)!;
    asked.add(q.id);
    belief = answerQuestion(belief, q, q.options[0]);
  }
  return toElicitationRecord(belief.responses, '2026-10-25T12:00:00.000Z')!;
}

const pour = (name: string, hedonic: number, i: number) => ({
  $type: 'app.cotidal.pour',
  drink: { name },
  rating: { hedonic },
  createdAt: new Date(Date.UTC(2026, 10, 1) + i * 60000).toISOString(),
});

const palate = {
  $type: 'app.cotidal.palate',
  mapCoordinates: { xHundredths: 420, yHundredths: 310 },
  aversions: { smoke: false, bitter: false, anise: false },
  createdAt: '2026-10-01T00:00:00.000Z',
};

/** A world where alice.bsky.social has a palate, a quiz, and `pours`, a page of `page` at a time. */
function world(pours: unknown[], opts: { page?: number; rev?: string | null; quiz?: unknown } = {}) {
  const calls: string[] = [];
  const impl = (async (input: string | URL | Request) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    calls.push(url.pathname + url.search);
    const json = (status: number, body?: unknown) => new Response(body === undefined ? '' : JSON.stringify(body), { status });
    if (url.pathname === '/xrpc/com.atproto.identity.resolveHandle') return json(200, { did: DID });
    if (url.href === `https://plc.directory/${DID}`)
      return json(200, {
        id: DID,
        alsoKnownAs: ['at://alice.bsky.social'],
        service: [{ id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: PDS }],
      });
    if (url.pathname === '/xrpc/com.atproto.repo.getRecord') return json(200, { value: palate });
    if (url.pathname === '/xrpc/com.atproto.sync.getLatestCommit') return opts.rev === null ? json(404) : json(200, { cid: 'x', rev: opts.rev ?? REV });
    if (url.pathname === '/xrpc/com.atproto.repo.listRecords') {
      const collection = url.searchParams.get('collection');
      if (collection === 'app.cotidal.elicitation') return json(200, { records: opts.quiz === null ? [] : [{ value: opts.quiz ?? quizRecord() }] });
      const size = opts.page ?? 100;
      const from = Number(url.searchParams.get('cursor') ?? 0);
      const slice = pours.slice(from, from + Math.min(size, Number(url.searchParams.get('limit'))));
      const next = from + slice.length;
      return json(200, { records: slice.map((value) => ({ value })), ...(next < pours.length ? { cursor: String(next) } : {}) });
    }
    return json(404);
  }) as typeof fetch;
  return { fetch: impl, calls };
}

const memoryCache = (): TasteCache & { size: () => number } => {
  const m = new Map<string, string>();
  return { get: async (k) => m.get(k) ?? null, put: async (k, v) => void m.set(k, v), size: () => m.size };
};

async function repoIn(w: ReturnType<typeof world>) {
  const repo = await resolvePublicRepo('alice.bsky.social', { fetch: w.fetch });
  if (repo.status !== 'ok') throw new Error('no repo');
  return repo;
}

describe('their taste', () => {
  test('is their latest questions and their rated pours, which the terrain is built from', async () => {
    const quiz = quizRecord();
    const w = world([pour('Manhattan', 9, 0), pour('Daiquiri (Classic)', 3, 1)], { quiz });
    const taste = await readPublicTaste(await repoIn(w), { cache: null });
    expect(taste!.start).toEqual(quizStart(quiz));
    expect(taste!.pours.map((p) => [p.drink.name, p.rating.hedonic])).toEqual([
      ['Manhattan', 9],
      ['Daiquiri (Classic)', 3],
    ]);
    // The same ground /map would draw from the same records.
    const t = buildTerrain(taste!.start!, taste!.pours);
    const manhattan = drinkDatabase.find((d) => d.name === 'Manhattan')!;
    const daiquiri = drinkDatabase.find((d) => d.name === 'Daiquiri (Classic)')!;
    expect(drinkHeight(t, manhattan).rating).toBeGreaterThan(drinkHeight(t, daiquiri).rating);
  });

  test('records that are not pours are passed over; no quiz on record is a null start', async () => {
    const w = world([{ junk: true }, pour('Negroni', 8, 0)], { quiz: null });
    const taste = await readPublicTaste(await repoIn(w), { cache: null });
    expect(taste!.start).toBeNull();
    expect(taste!.pours).toHaveLength(1);
  });

  test('pages through a long log, newest first, and stops at MAX_POURS', async () => {
    const many = Array.from({ length: MAX_POURS + 150 }, (_, i) => pour('Negroni', 7, i));
    const w = world(many, { page: 100 });
    const taste = await readPublicTaste(await repoIn(w), { cache: null });
    expect(taste!.pours).toHaveLength(MAX_POURS);
    expect(w.calls.filter((c) => c.includes('collection=app.cotidal.pour')).length).toBe(MAX_POURS / 100);
  });

  test('is cached by revision: unchanged, a second view reads no records; changed, it reads them again', async () => {
    const cache = memoryCache();
    const w = world([pour('Negroni', 8, 0)]);
    const repo = await repoIn(w);
    await readPublicTaste(repo, { cache });
    const listed = () => w.calls.filter((c) => c.includes('listRecords')).length;
    const first = listed();
    expect(first).toBeGreaterThan(0);
    await readPublicTaste(repo, { cache });
    expect(listed()).toBe(first);
    expect(cache.size()).toBe(1);

    const changed = world([pour('Negroni', 8, 0), pour('Manhattan', 9, 1)], { rev: '3l3qo2vutsw2c' });
    const again = await readPublicTaste(await repoIn(changed), { cache });
    expect(again!.pours).toHaveLength(2);
  });

  test('with no revision to key it by, nothing is cached', async () => {
    const cache = memoryCache();
    await readPublicTaste(await repoIn(world([pour('Negroni', 8, 0)], { rev: null })), { cache });
    expect(cache.size()).toBe(0);
  });

  test('is read with the palate only when asked for', async () => {
    const w = world([pour('Negroni', 8, 0)]);
    const plain = await readPublicPalate('alice.bsky.social', { fetch: w.fetch });
    expect(plain.status === 'ok' && plain.taste).toBeUndefined();
    const withTaste = await readPublicPalate('alice.bsky.social', { fetch: w.fetch, taste: true, tasteCache: null });
    expect(withTaste.status === 'ok' && withTaste.taste?.pours).toHaveLength(1);
  });
});

describe('made-up people (sample-people.ts)', () => {
  test('read through the same reader as anyone, with no network, and marked as made up', async () => {
    const noNetwork = (async () => {
      throw new Error('no network for a made-up person');
    }) as typeof fetch;
    const r = await readPublicPalate('deep.test', { fetch: noNetwork, taste: true, tasteCache: null });
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.actor.sample).toBe(true);
    expect(r.actor.handle).toBe('deep.test');
    expect(r.taste?.pours.map((p) => p.drink.name)).toContain('Manhattan');
    // By DID too, and someone with no palate is no palate.
    expect((await readPublicPalate(r.actor.did, { fetch: noNetwork })).status).toBe('ok');
    expect((await readPublicPalate('quiet.test', { fetch: noNetwork })).status).toBe('no-palate');
  });

  test('only on .test, which no real person can hold', async () => {
    const { SAMPLE_PEOPLE } = await import('../../src/lib/atproto/sample-people');
    for (const handle of Object.keys(SAMPLE_PEOPLE)) expect(handle.endsWith('.test')).toBe(true);
  });
});

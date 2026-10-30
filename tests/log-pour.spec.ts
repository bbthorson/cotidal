import { test, expect } from '@playwright/test';
import { buildPour, logPour, palateAfterPour, pourPostText, type PourStore } from '../src/lib/pours.server';
import { feedPostRecord } from '../src/lib/atproto/publish';
import { graphemeLength } from '../src/lib/atproto/lex-string';
import type { Palate, PourRecord } from '../src/lib/atproto/records';
import type { LogDrinkOptions } from '../src/lib/api-client';
import { calculateDistance } from '../src/lib/scoring';
import { drinkDatabase } from '../src/lib/data';
import { apiErrors, pour as pourCopy } from '../src/lib/copy';

/**
 * Logging a pour — the one pipeline the page and (later) a chat assistant
 * share. The store is a fake, so this covers the order of writes and what is
 * refused without a PDS.
 */

const register = { 'Daiquiri (Classic)': { slug: 'daiquiri', title: 'Daiquiri', build: 'Rum · Lime · Sugar' } };
const context = { register, appUrl: 'https://cotidal.example' };

const palate = (x: number, y: number): Palate => ({
  $type: 'app.cotidal.palate',
  mapCoordinates: { x, y },
  aversions: { smoke: false, bitter: false, anise: false },
  vibeTags: {},
  createdAt: '2026-10-01T00:00:00.000Z',
});

function fakeStore(prior: Palate | null, fail: Partial<Record<keyof PourStore, boolean>> = {}) {
  const writes: string[] = [];
  const state = {
    palate: null as Palate | null,
    pour: null as PourRecord | null,
    shared: null as { text: string; url: string } | null,
  };
  const store: PourStore = {
    did: 'did:plc:x',
    async readPalate() {
      if (fail.readPalate) throw new Error('PDS down');
      return prior;
    },
    async writePalate(p) {
      if (fail.writePalate) throw new Error('PDS down');
      writes.push('palate');
      state.palate = p;
    },
    async writePour(p) {
      if (fail.writePour) throw new Error('PDS down');
      writes.push('pour');
      state.pour = p;
      return { uri: 'at://did:plc:x/app.cotidal.pour/1' };
    },
    async share(text, url) {
      if (fail.share) throw new Error('feed down');
      writes.push('share');
      state.shared = { text, url };
    },
  };
  return { store, writes, state };
}

test('Log pour: a request without a drink, or one that does not fit its lexicon, is refused', () => {
  expect(buildPour(undefined, register)).toEqual({ ok: false, error: apiErrors.invalidRequest });
  expect(buildPour({ rating: 8 }, register)).toEqual({ ok: false, error: pourCopy.needDrink });
  expect(buildPour({ drinkName: '   ' }, register)).toEqual({ ok: false, error: pourCopy.needDrink });
  const badSpirit = { drinkName: 'Negroni', baseSpirit: 'kerosene' } as unknown as Partial<LogDrinkOptions>;
  expect(buildPour(badSpirit, register)).toEqual({ ok: false, error: apiErrors.invalidPour });
});

test('Log pour: what was not said is absent from the record', () => {
  const built = buildPour({ drinkName: 'Negroni', rating: 8, isHomePour: true }, register);
  expect(built.ok).toBe(true);
  if (!built.ok) return;
  const { record } = built.pour;
  expect(record.rating.wouldOrderAgain).toBeUndefined();
  expect(record.rating.glmsValence).toBeUndefined();
  expect(record.venue).toBeUndefined();
  expect(record.deviations).toBeUndefined();
  expect(record.cata).toBeUndefined();
  expect(record.note).toBeUndefined();
});

test('Log pour: the rating maps onto the 9-point hedonic, and the drink onto its entry', () => {
  const at = (rating: number) => {
    const built = buildPour({ drinkName: 'daiquiri (classic)', rating }, register);
    if (!built.ok) throw new Error(built.error);
    return built.pour;
  };
  expect(at(0).hedonic).toBe(1);
  expect(at(10).hedonic).toBe(9);
  expect(at(10).record.drink.slug).toBe('daiquiri');
  expect(at(10).drink?.name).toBe('Daiquiri (Classic)');
  expect(at(5).record.venue?.entity.name).toBe('Unknown Venue');
});

test('Log pour: a refused pour writes nothing', async () => {
  const { store, writes } = fakeStore(palate(1, 1));
  const result = await logPour(store, { rating: 8 }, context);
  expect(result).toEqual({ ok: false, status: 400, error: pourCopy.needDrink });
  expect(writes).toEqual([]);
});

test('Log pour: the palate is written, then the pour, and the answer is the written palate', async () => {
  const { store, writes, state } = fakeStore(palate(-6, -5));
  const result = await logPour(store, { drinkName: 'Daiquiri (Classic)', rating: 10 }, context);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(writes).toEqual(['palate', 'pour']);
  expect(result.uri).toBe('at://did:plc:x/app.cotidal.pour/1');
  expect(result.profile.x).toBe(state.palate?.mapCoordinates.x);
  expect(result.profile.y).toBe(state.palate?.mapCoordinates.y);
  expect(state.palate?.createdAt).toBe('2026-10-01T00:00:00.000Z');
  // A drink loved from across the map pulls the coordinate toward it.
  const daiquiri = drinkDatabase.find((d) => d.name === 'Daiquiri (Classic)')!;
  expect(calculateDistance(result.profile, daiquiri)).toBeLessThan(calculateDistance({ x: -6, y: -5 }, daiquiri));
});

test('Log pour: someone with no palate yet starts from a fresh one', async () => {
  const { store, writes, state } = fakeStore(null);
  const result = await logPour(store, { drinkName: 'Negroni', rating: 6 }, context);
  expect(result.ok).toBe(true);
  expect(writes).toEqual(['palate', 'pour']);
  expect(state.palate?.dynamicState?.eventCount).toBe(1);
});

test('Log pour: the feed post is only on request, and its failure does not fail the pour', async () => {
  const quiet = fakeStore(palate(0, 0));
  await logPour(quiet.store, { drinkName: 'Negroni', rating: 8 }, context);
  expect(quiet.writes).not.toContain('share');

  const loud = fakeStore(palate(0, 0), { share: true });
  const result = await logPour(loud.store, { drinkName: 'Negroni', rating: 8, crosspostToFeed: true }, context);
  expect(result.ok).toBe(true);
  expect(loud.writes).toEqual(['palate', 'pour']);
});

test('Log pour: a repository that fails is a 500, and a failed palate write logs no pour', async () => {
  for (const fail of ['readPalate', 'writePalate', 'writePour'] as const) {
    const { store, writes } = fakeStore(palate(0, 0), { [fail]: true });
    const result = await logPour(store, { drinkName: 'Negroni', rating: 8 }, context);
    expect(result).toEqual({ ok: false, status: 500, error: apiErrors.logFailed });
    if (fail !== 'writePour') expect(writes).not.toContain('pour');
  }
});

test('Log pour: a drink not on the map is logged, but cannot move the coordinate', () => {
  const built = buildPour({ drinkName: 'Grandma’s Punch', rating: 9 }, register);
  expect(built.ok).toBe(true);
  if (!built.ok) return;
  expect(built.pour.drink).toBeUndefined();
  expect(built.pour.record.drink.slug).toBeUndefined();
  // With nowhere to place it, there is nothing to learn from how it landed.
  const next = palateAfterPour(palate(2, 3), built.pour);
  expect(next.mapCoordinates).toEqual({ x: 2, y: 3 });
  expect(next.dynamicState?.eventCount).toBe(0);
});

const postFor = (options: Partial<LogDrinkOptions>) => {
  const built = buildPour({ drinkName: 'Negroni', ...options }, register);
  if (!built.ok) throw new Error(built.error);
  return pourPostText(built.pour);
};

test('Feed post: a pour is posted in the form’s own words, not as a palate share', async () => {
  const { store, writes, state } = fakeStore(palate(0, 0));
  // 8.75 is what the form sends for "Like very much", 8 of 9.
  await logPour(store, { drinkName: 'Negroni', rating: 8.75, venue: { name: 'Attaboy' }, crosspostToFeed: true }, context);
  expect(writes).toEqual(['palate', 'pour', 'share']);
  expect(state.shared?.text).toBe('Negroni at Attaboy: Like very much (8 of 9). Logged on Cotidal:');
  // The post that went out before this read "My palate lands in Logged a 8.8/10 Negroni…".
  expect(state.shared?.text).not.toContain('My palate lands in');
  expect(state.shared?.url).toBe('https://cotidal.example/p/did:plc:x');
});

test('Feed post: at home, at a bar, and at a bar with no name', () => {
  expect(postFor({ rating: 10, isHomePour: true })).toBe('Negroni, poured at home: Like extremely (9 of 9). Logged on Cotidal:');
  expect(postFor({ rating: 0, location: 'Dante' })).toBe('Negroni at Dante: Dislike extremely (1 of 9). Logged on Cotidal:');
  expect(postFor({ rating: 5 })).toBe('Negroni: Neither (5 of 9). Logged on Cotidal:');
});

test('Feed post: long names are cut to fit, and the link survives whole', () => {
  const url = 'https://cotidal.example/p/did:plc:abcdefghijklmnopqrstuvwx';
  const text = postFor({ drinkName: 'N'.repeat(400), venue: { name: 'V'.repeat(400) } });
  const record = feedPostRecord(text, url);
  expect(graphemeLength(record.text)).toBeLessThanOrEqual(300);
  expect(record.text.endsWith(` ${url}`)).toBe(true);
  const bytes = new TextEncoder().encode(record.text);
  const { byteStart, byteEnd } = record.facets[0].index;
  expect(new TextDecoder().decode(bytes.slice(byteStart, byteEnd))).toBe(url);
});

test('Feed post: the link facet counts bytes, not characters', () => {
  const url = 'https://cotidal.example/p/did:plc:x';
  const record = feedPostRecord('Négroni at Café Ñ 🍸:', url);
  const bytes = new TextEncoder().encode(record.text);
  const { byteStart, byteEnd } = record.facets[0].index;
  expect(new TextDecoder().decode(bytes.slice(byteStart, byteEnd))).toBe(url);
});

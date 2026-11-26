import { compareWith } from '../../src/lib/compare';
import { test, expect } from 'vitest';
import {
  comparePalates,
  getBarMenu,
  getDrink,
  getPalate,
  matchDrink,
  myBars,
  rankMenu,
  recommendDrinks,
  recommendForGroup,
  searchDrinks,
  type ToolContext,
} from '../../src/lib/mcp/tools';
import { drinkDatabase } from '../../src/lib/data';
import { compareTerrains } from '../../src/lib/overlap';
import { menuOf, nearestHilltop, terrainOf } from '../../src/lib/taste-reading';
import { leanings } from '../../src/lib/terrain';
import { taste } from '../../src/lib/copy';
import { wayTo } from '../../src/lib/drink-search';
import type { PublicPalateResult } from '../../src/lib/atproto/public-read';
import { mcp } from '../../src/lib/copy';

/**
 * `/mcp`: the palate map as tools a chat assistant can call.
 *
 * The tools are plain functions over a palate reader, tested here with a fake
 * one. They must agree with `/p/<handle>`, so the expectations are computed
 * from the same `overlap.ts` functions rather than written out by hand.
 */

const DID_A = 'did:plc:aaaaaaaaaaaaaaaaaaaaaaaa';
const DID_B = 'did:plc:bbbbbbbbbbbbbbbbbbbbbbbb';

const none = { smoke: false, bitter: false, anise: false };

const people: Record<string, PublicPalateResult> = {
  'alice.bsky.social': {
    status: 'ok',
    actor: { did: DID_A, handle: 'alice.bsky.social' },
    palate: { x: 6.04, y: 5.2, aversions: { ...none, bitter: true }, pours: 4, updatedAt: '2026-10-01T00:00:00.000Z' },
  },
  'bob.bsky.social': {
    status: 'ok',
    actor: { did: DID_B, handle: null },
    palate: { x: -6, y: -5, aversions: none, pours: null, updatedAt: null },
  },
  'quiet.bsky.social': { status: 'no-palate', actor: { did: DID_B, handle: 'quiet.bsky.social' } },
  'slow.bsky.social': { status: 'unavailable', actor: null },
};

const ctx: ToolContext = {
  readPalate: async (actor) =>
    people[actor] ?? (actor.includes('.') ? { status: 'not-found' } : { status: 'invalid' }),
  register: { 'Daiquiri (Classic)': { slug: 'daiquiri', title: 'Daiquiri', build: 'Rum · Lime · Sugar' } },
  origin: 'https://cotidal.example',
};

test('MCP: a palate reads as how it leans, flavours avoided, its menu and public map — never a region', async () => {
  const result = await getPalate('alice.bsky.social', ctx);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.data.x).toBe(6);
  expect('region' in result.data).toBe(false);
  expect(result.data.avoids).toEqual(['bitterness']);
  expect(result.data.pours).toBe(4);
  expect(result.data.url).toBe('https://cotidal.example/p/alice.bsky.social');
  // The same reading her map gives: her ground (here from her point, with no records), its menu, its words.
  const terrain = terrainOf(null, { x: 6.04, y: 5.2 }, []);
  expect(result.data.leans).toBe(taste.phrases(leanings(terrain, 2)));
  expect(result.data.menu.map((d) => d.name)).toEqual(menuOf(terrain, { ...none, bitter: true }, new Map(), 3).map((d) => d.name));
  for (const d of result.data.menu) expect(d.reason).toMatch(/their/);
});

test('MCP: an unverified handle links the public map by DID', async () => {
  const result = await getPalate('bob.bsky.social', ctx);
  expect(result.ok && result.data.url).toBe(`https://cotidal.example/p/${DID_B}`);
});

test('MCP: every way a read fails is a message, not a throw', async () => {
  for (const [input, fragment] of [
    ['nobody', 'not a Bluesky handle'],
    ['nobody.bsky.social', 'does not resolve'],
    ['quiet.bsky.social', 'has not published a palate'],
    ['slow.bsky.social', 'did not respond'],
  ]) {
    const result = await getPalate(input, ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain(fragment);
  }
});

test('MCP: recommendations are nearest first, honour aversions and the type filter', async () => {
  const result = await recommendDrinks('alice.bsky.social', { count: 8, type: 'Cocktail' }, ctx);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.data.drinks).toHaveLength(8);
  const distances = result.data.drinks.map((d) => d.distance);
  expect(distances).toEqual([...distances].sort((a, b) => a - b));
  // Each says which way it lies, in the app's own words.
  for (const d of result.data.drinks) expect(d.way).toMatch(/^(right here|(richer|crisper|sweeter|more savory)(, (sweeter|more savory))?)$/);
  for (const d of result.data.drinks) {
    const drink = drinkDatabase.find((x) => x.name === d.name)!;
    expect(drink.type).toBe('Cocktail');
    expect(drink.isBitter).toBe(false);
  }
});

test('MCP: a drink name matches whole, or without its parenthetical, and nothing looser', () => {
  expect(matchDrink('daiquiri')?.name).toBe('Daiquiri (Classic)');
  expect(matchDrink('  DAIQUIRI (classic) ')?.name).toBe('Daiquiri (Classic)');
  expect(matchDrink('Naked and Famous')?.name).toBe('Naked & Famous');
  expect(matchDrink("Bees Knees")?.name).toBe("Bee's Knees");
  expect(matchDrink('House daiquiri with mezcal')).toBeNull();
  expect(matchDrink('')).toBeNull();
});

test('MCP: no two drinks share a name once the parenthetical is gone', () => {
  // matchDrink takes the first drink by base name; a collision would make
  // one of them unreachable from a menu.
  const base = (n: string) => matchDrink(n.replace(/\([^)]*\)/g, ''))?.name;
  for (const drink of drinkDatabase) expect(base(drink.name)).toBe(drink.name);
});

test('MCP: a menu is ranked by distance, avoided flavours last, unknowns unplaced', async () => {
  const items = ['Negroni', 'Daiquiri', 'Mojito', 'Grandma’s Secret Punch'];
  const result = await rankMenu('alice.bsky.social', items, ctx);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const { ranked, unplaced } = result.data;
  expect(unplaced.map((u) => u.item)).toEqual(['Grandma’s Secret Punch']);
  // Negroni is bitter and Alice avoids bitterness: flagged and sunk, not dropped.
  expect(ranked.at(-1)?.name).toBe('Negroni');
  expect(ranked.at(-1)?.caution).toContain('bitterness');
  const daiquiri = ranked.find((r) => r.item === 'Daiquiri');
  expect(daiquiri?.name).toBe('Daiquiri (Classic)');
  expect(daiquiri?.url).toBe('https://cotidal.example/drinks/daiquiri');
  const clean = ranked.filter((r) => !r.caution).map((r) => r.distance);
  expect(clean).toEqual([...clean].sort((a, b) => a - b));
});

test('MCP: comparing two palates agrees with the public map', async () => {
  const result = await comparePalates('alice.bsky.social', 'bob.bsky.social', ctx);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const a = people['alice.bsky.social'];
  const b = people['bob.bsky.social'];
  if (a.status !== 'ok' || b.status !== 'ok') throw new Error('fixture');
  const overlap = compareTerrains(
    { terrain: terrainOf(null, a.palate, []), aversions: a.palate.aversions },
    { terrain: terrainOf(null, b.palate, []), aversions: b.palate.aversions }
  );
  expect(result.data.inCommon).toBe(overlap.inCommon);
  expect(result.data.firstWouldOrder?.name).toBe(overlap.firstOnly?.name);
  expect(result.data.secondWouldOrder?.name).toBe(overlap.secondOnly?.name);
  expect(result.data.shared?.name).toBe(overlap.shared?.name);
  // How far and which way, as /p says it: one comparison (`compareWith`), a person as a set of points.
  const side = (p: typeof a.palate) => ({ terrain: terrainOf(null, p, []), aversions: p.aversions, point: { x: p.x, y: p.y } });
  const c = compareWith(side(a.palate), { kind: 'person', side: side(b.palate) });
  expect(result.data.distance).toBe(c.distance);
  expect(result.data.way).toBe(c.words);
});

test('MCP: comparing with someone who cannot be read says who', async () => {
  const result = await comparePalates('alice.bsky.social', 'quiet.bsky.social', ctx);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.message).toContain('@quiet.bsky.social');
});

test('MCP: search puts the exact match first, then names containing the query', () => {
  const result = searchDrinks('martini', ctx);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.data.drinks.length).toBeGreaterThan(1);
  for (const d of result.data.drinks) expect(d.name.toLowerCase()).toContain('martini');
  const daiquiri = searchDrinks('daiquiri', ctx);
  expect(daiquiri.ok && daiquiri.data.drinks[0].name).toBe('Daiquiri (Classic)');
  expect(searchDrinks('zzzz', ctx).ok).toBe(false);
});

test('MCP: rankMenu flags avoided flavours and suggests close classics on unplaced house cocktails', async () => {
  const result = await rankMenu(
    'alice.bsky.social',
    [
      'Daiquiri',
      { name: 'House Bitter', description: 'bourbon, Campari, sweet vermouth' },
      'Velvet Smoke — mezcal, Aperol, lime',
    ],
    ctx
  );
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.data.ranked).toHaveLength(1);
  expect(result.data.unplaced).toHaveLength(2);
  // Alice avoids bitterness: both Campari and Aperol trigger a caution.
  expect(result.data.unplaced[0].caution).toContain('bitterness');
  expect(result.data.unplaced[0].closestClassic?.name).toBe('Boulevardier');
  expect(result.data.unplaced[1].caution).toContain('bitterness');
  expect(result.data.unplaced[1].closestClassic?.name).toBe('Naked & Famous');
});

test('MCP: getDrink returns coordinate, flags, tags, and register build', async () => {
  const withBuild: ToolContext = {
    ...ctx,
    register: {
      Negroni: { slug: 'negroni', title: 'Negroni', build: 'Gin · Campari · Sweet vermouth' },
    },
  };
  const found = await getDrink('negroni', withBuild);
  expect(found.ok).toBe(true);
  if (!found.ok) return;
  expect(found.data.name).toBe('Negroni');
  expect(found.data.isBitter).toBe(true);
  expect(found.data.build).toBe('Gin · Campari · Sweet vermouth');
  expect(found.data.fromThem).toBeUndefined();
  expect((await getDrink('not a real drink', withBuild)).ok).toBe(false);
});

test('MCP: getDrink with a handle says what put it there for them, which way it lies from their high ground, and what they avoid in it', async () => {
  // "What about an oaky Chardonnay?" — answered from the map, not guessed.
  const found = await getDrink('Chardonnay (Oaked)', ctx, 'alice.bsky.social');
  expect(found.ok).toBe(true);
  if (!found.ok) return;
  const alice = people['alice.bsky.social'];
  if (alice.status !== 'ok') throw new Error('fixture');
  const drink = matchDrink('Chardonnay (Oaked)')!;
  expect(found.data.fromThem?.handle).toBe('alice.bsky.social');
  const terrain = terrainOf(null, alice.palate, []);
  const from = wayTo(nearestHilltop(terrain, drink, alice.palate), drink);
  expect(found.data.fromThem?.distance).toBe(from.distance);
  expect(found.data.fromThem?.way).toBe('richer, more savory');
  expect(found.data.fromThem?.reason).toBe('Near where their answers put them');
  // Alice avoids bitter; a bitter drink says so rather than being left out.
  const negroni = await getDrink('negroni', ctx, 'alice.bsky.social');
  expect(negroni.ok && negroni.data.fromThem?.avoided).toEqual([mcp.flavours.bitter]);
  // A handle that does not resolve is an error, not a drink with no distance.
  expect((await getDrink('negroni', ctx, 'nobody.bsky.social')).ok).toBe(false);
});

test('MCP: recommendForGroup respects every person’s aversions and returns widestContrast', async () => {
  const result = await recommendForGroup(['alice.bsky.social', 'bob.bsky.social'], { count: 3 }, ctx);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.data.people).toHaveLength(2);
  expect(result.data.drinks).toHaveLength(3);
  for (const d of result.data.drinks) {
    const full = drinkDatabase.find((x) => x.name === d.name)!;
    expect(full.isBitter).toBe(false);
  }
  // Alice and Bob sit far apart: few of her top drinks are in his.
  expect(result.data.widestContrast?.inCommon).toBeLessThan(5);
  // The order is the answer: no heights or distances are handed to the assistant.
  for (const d of result.data.drinks) expect(Object.keys(d)).not.toContain('maxDistance');
});

test('MCP: myBars summarizes visited bars and excludes home pours', async () => {
  const memberCtx: ToolContext = {
    ...ctx,
    member: {
      did: DID_A,
      recentPours: async () => [
        {
          $type: 'app.cotidal.pour',
          drink: { name: 'Negroni' },
          rating: { hedonic: 8 },
          venue: { entity: { name: 'Attaboy' } },
          createdAt: '2026-11-02T00:00:00.000Z',
        },
        {
          $type: 'app.cotidal.pour',
          drink: { name: 'Last Word' },
          rating: { hedonic: 9 },
          venue: { entity: { name: 'Attaboy' } },
          createdAt: '2026-11-01T00:00:00.000Z',
        },
        {
          $type: 'app.cotidal.pour',
          drink: { name: 'Daiquiri (Classic)' },
          rating: { hedonic: 7 },
          isHomePour: true,
          createdAt: '2026-11-03T00:00:00.000Z',
        },
      ],
      logPour: async () => null,
    },
  };
  const result = await myBars(memberCtx);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.data.bars).toHaveLength(1);
  expect(result.data.bars[0]).toMatchObject({
    bar: 'Attaboy',
    pours: 2,
    averageHedonic: 8.5,
    topDrinks: ['Last Word', 'Negroni'],
  });
});

test('MCP: getBarMenu reads a claimed bar’s menu and ranks it when a drinker handle is given', async () => {
  const venueCtx: ToolContext = {
    ...ctx,
    readVenue: async (bar) =>
      bar === 'attaboy.nyc'
        ? {
            status: 'ok',
            actor: { did: 'did:plc:bar111111111111111111111', handle: 'attaboy.nyc' },
            venue: {
              name: 'Attaboy',
              description: 'Bespoke cocktails.',
              website: 'https://attaboy.nyc',
              menu: {
                title: 'House Classics',
                publishedAt: '2026-11-01T00:00:00.000Z',
                sections: [
                  {
                    name: null,
                    items: [
                      {
                        name: 'Daiquiri',
                        description: null,
                        price: null,
                        placed: drinkDatabase.find((d) => d.name === 'Daiquiri (Classic)')!,
                      },
                      {
                        name: 'House Smoke',
                        description: 'mezcal, Campari, lime',
                        price: null,
                        placed: null,
                      },
                    ],
                  },
                ],
              },
            },
          }
        : { status: 'not-found' },
  };

  const result = await getBarMenu('attaboy.nyc', 'alice.bsky.social', venueCtx);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.data.venue.name).toBe('Attaboy');
  expect(result.data.venue.url).toContain('/v/attaboy.nyc');
  expect(result.data.ranking?.ranked).toHaveLength(1);
  expect(result.data.ranking?.unplaced[0].caution).toContain('bitterness');
});

import { test, expect } from '@playwright/test';
import {
  comparePalates,
  getPalate,
  matchDrink,
  rankMenu,
  recommendDrinks,
  searchDrinks,
  type ToolContext,
} from '../src/lib/mcp/tools';
import { drinkDatabase } from '../src/lib/data';
import { compareMaps, nearestDrinks } from '../src/lib/overlap';
import type { PublicPalateResult } from '../src/lib/atproto/public-read';

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

test('MCP: a palate reads as its region, flavours avoided and public map', async () => {
  const result = await getPalate('alice.bsky.social', ctx);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.data.x).toBe(6);
  expect(result.data.region.id).toBe('surf');
  expect(result.data.region.url).toBe('https://cotidal.example/regions/surf');
  expect(result.data.avoids).toEqual(['bitterness']);
  expect(result.data.pours).toBe(4);
  expect(result.data.url).toBe('https://cotidal.example/p/alice.bsky.social');
  const point = { x: 6.04, y: 5.2, aversions: { ...none, bitter: true } };
  expect(result.data.nearest.map((d) => d.name)).toEqual(nearestDrinks(point).map((d) => d.name));
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
  const overlap = compareMaps(a.palate, b.palate);
  expect(result.data.description).toBe(overlap.description);
  expect(result.data.firstWouldOrder?.name).toBe(overlap.theirs?.name);
  expect(result.data.secondWouldOrder?.name).toBe(overlap.yours?.name);
  expect(result.data.shared?.name).toBe(overlap.shared?.name);
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

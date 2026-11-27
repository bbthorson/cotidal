import { test, expect } from 'vitest';
import { byRelevance, DISLIKED_AT, HEIGHT_BAND, relevanceOf, type MinimalDrinkLog } from '../../src/lib/palate/scoring';
import { buildTerrain, drinkHeight, type TerrainPour } from '../../src/lib/palate/terrain';
import type { Drink } from '../../src/lib/drinks/data';

/**
 * The terrain decides; taste only sorts drinks that stand about level
 * (`relevanceOf`). AGENTS.md: a drink's height on your terrain gives the
 * order; vibe tags, the bar and the tolerances sort within a band of it.
 */

const drink = (name: string, x: number, y: number, extra: Partial<Drink> = {}): Drink => ({
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  type: 'Cocktail',
  x,
  y,
  hasSmoke: false,
  isBitter: false,
  hasAnise: false,
  tags: [],
  ...extra,
});

const log = (drinkName: string, hedonicScale: number, location = 'Home Pour'): MinimalDrinkLog => ({
  drinkName,
  location,
  hedonicScale,
  createdAt: new Date().toISOString(),
});
const asPour = (l: MinimalDrinkLog): TerrainPour => ({ drink: { name: l.drinkName }, rating: { hedonic: l.hedonicScale } });

/** The order of `drinks` for someone the questions put at `user`, who has poured `logs`. */
const order = (user: Parameters<typeof relevanceOf>[0], drinks: Drink[], logs: MinimalDrinkLog[] = [], at?: string) => {
  const terrain = buildTerrain({ x: user.x, y: user.y }, logs.map(asPour), drinks);
  return drinks
    .map((d) => ({ name: d.name, ...relevanceOf(user, d, logs, at, terrain) }))
    .sort(byRelevance)
    .map((d) => d.name);
};

const tagged = { x: 0, y: 0, vibeTags: { classic: 5, social: 5 } };

test('Relevance: with nothing rated, a nearer drink outranks a farther one, however well the farther one matches your tags', () => {
  const near = drink('Near, untagged', 0.5, 0);
  const far = drink('Far, every tag', 4, 0, { tags: ['classic', 'social'] });
  expect(order(tagged, [far, near])).toEqual(['Near, untagged', 'Far, every tag']);
});

test('Relevance: among drinks that stand about level, your tags decide', () => {
  const plain = drink('Plain', 0.2, 0);
  const matched = drink('Matched', 0.4, 0, { tags: ['classic', 'social'] });
  expect(order(tagged, [plain, matched])).toEqual(['Matched', 'Plain']);
  // With no tags, the higher of the two comes first.
  expect(order({ x: 0, y: 0 }, [matched, plain])).toEqual(['Plain', 'Matched']);
});

test('Relevance: says how far, to one decimal', () => {
  const t = buildTerrain({ x: 0, y: 0 }, []);
  expect(relevanceOf({ x: 0, y: 0 }, drink('Three-four-five', 3, 4), [], null, t).distance).toBe(5);
  expect(relevanceOf({ x: 0, y: 0 }, drink('Root two', 1, 1), [], null, t).distance).toBe(1.4);
});

test('Relevance: a drink near one you rated high comes before one as near your point that nothing backs', () => {
  const loved = drink('Loved', 5, 0);
  const besideIt = drink('Beside it', 5.5, 0.5);
  const otherSide = drink('Other side', -5.5, 0.5);
  expect(order({ x: 0, y: 0 }, [loved, besideIt, otherSide], [log('Loved', 9)])).toEqual(['Loved', 'Beside it', 'Other side']);
});

test('Relevance: says what put a drink there — the ratings near it, not itself — and your own rating of it', () => {
  const drinks = [drink('Loved', 5, 0), drink('Beside it', 5.5, 0.5)];
  const logs = [log('Loved', 9)];
  const t = buildTerrain({ x: 0, y: 0 }, logs.map(asPour), drinks);
  const beside = relevanceOf({ x: 0, y: 0 }, drinks[1], logs, null, t);
  expect(beside.evidence.map((e) => [e.drink.name, e.hedonic])).toEqual([['Loved', 9]]);
  expect(beside.rated).toBeUndefined();
  const itself = relevanceOf({ x: 0, y: 0 }, drinks[0], logs, null, t);
  expect(itself.evidence).toEqual([]);
  expect(itself.rated).toBe(9);
});

test(`Relevance: a drink you rated ${DISLIKED_AT} or less goes below everything`, () => {
  const disliked = drink('Disliked', 0, 0, { tags: ['classic', 'social'] });
  const farthest = drink('Farthest', 10, 10);
  expect(order(tagged, [disliked, farthest], [log('Disliked', 2)])).toEqual(['Farthest', 'Disliked']);
});

test('Relevance: among liked drinks that stand level, one liked at this bar comes first, at this bar only', () => {
  // Rated alike, side by side: only the bar tells them apart.
  const here = drink('Liked here', 0.3, 0);
  const home = drink('Liked at home', 0.2, 0);
  const logs = [log('Liked here', 8, 'The Nomad Bar'), log('Liked at home', 8)];
  expect(order({ x: 0, y: 0 }, [home, here], logs, 'The Nomad Bar')).toEqual(['Liked here', 'Liked at home']);
  expect(order({ x: 0, y: 0 }, [here, home], logs, 'Sage Apothecary')).toEqual(['Liked at home', 'Liked here']);
});

test('Relevance: trained tolerances sort within the band; an untrained filter changes nothing', () => {
  const bitter = drink('Test Negroni', 0.3, 0, { isBitter: true });
  const sweet = drink('Test Daiquiri', 0.2, 0);
  const t = buildTerrain({ x: 0, y: 0 }, [], [bitter, sweet]);
  const at = (bitterTolerance: number, eventCount: number) => ({
    x: 0,
    y: 0,
    tolerances: { bitter: bitterTolerance, tannin: 5, complexity: 5, eventCount },
  });
  expect(order(at(9, 0), [bitter, sweet])).toEqual(['Test Daiquiri', 'Test Negroni']);
  const rank = (u: Parameters<typeof relevanceOf>[0]) => relevanceOf(u, bitter, [], null, t).rank;
  expect(rank(at(9, 0))).toBe(rank({ x: 0, y: 0 }));
  expect(rank(at(9, 4))).toBeLessThan(rank({ x: 0, y: 0 }));
  expect(rank(at(1, 4))).toBeGreaterThan(rank({ x: 0, y: 0 }));
});

test('Relevance: everything that sorts within a band together never reaches the next band', () => {
  // The most a drink can gain inside its band (every tag, a good pour at this
  // bar, the most favourable trained tolerances) against the most a drink one
  // band higher can lose: the higher one still comes first.
  const tolerances = (t: number) => ({ bitter: t, tannin: t, complexity: 5, eventCount: 9 });
  const fond = { x: 0, y: 0, vibeTags: { classic: 5 }, tolerances: tolerances(10) };
  const averse = { x: 0, y: 0, tolerances: tolerances(0) };
  const props = { isBitter: true, hasSmoke: true } as const;
  const higher = drink('Higher', 0, 0, props);
  const t0 = buildTerrain({ x: 0, y: 0 }, [], [higher]);
  // Find a spot a whole band lower than the top of the hill.
  let x = 0;
  while (drinkHeight(t0, drink('probe', x, 0)).rating > drinkHeight(t0, higher).rating - HEIGHT_BAND * 1.5) x += 0.1;
  const lower = drink('Lower', x, 0, { tags: ['classic'], ...props });
  const t = buildTerrain({ x: 0, y: 0 }, [], [higher, lower]);
  const best = relevanceOf(fond, lower, [log('Lower', 6, 'Here')], 'Here', t);
  const worst = relevanceOf(averse, higher, [], null, t);
  expect(worst.rank).toBeLessThan(best.rank);
});

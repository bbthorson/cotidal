import { test, expect } from 'vitest';
import {
  byRelevance,
  LIKED_LIFT,
  RELEVANCE_BAND,
  relevanceOf,
  type MinimalDrinkLog,
} from '../../src/lib/scoring';
import type { Drink } from '../../src/lib/data';

/**
 * Distance decides; taste only sorts drinks about as close (`relevanceOf`).
 * AGENTS.md: "Euclidean distance gives the raw match; VibeTags sort within it."
 */

const drink = (name: string, x: number, y: number, extra: Partial<Drink> = {}): Drink => ({
  name,
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

const order = (user: Parameters<typeof relevanceOf>[0], drinks: Drink[], logs: MinimalDrinkLog[] = [], at?: string) =>
  drinks
    .map((d) => ({ name: d.name, ...relevanceOf(user, d, logs, at) }))
    .sort(byRelevance)
    .map((d) => d.name);

const tagged = { x: 0, y: 0, vibeTags: { classic: 5, social: 5 } };

test('Relevance: a nearer drink outranks a farther one, however well the farther one matches your tags', () => {
  const near = drink('Near, untagged', 0.5, 0);
  const far = drink('Far, every tag', 3, 0, { tags: ['classic', 'social'] });
  expect(order(tagged, [far, near])).toEqual(['Near, untagged', 'Far, every tag']);
});

test('Relevance: among drinks about as close, your tags decide', () => {
  const plain = drink('Plain', 0.2, 0);
  const matched = drink('Matched', 0.6, 0, { tags: ['classic', 'social'] });
  expect(order(tagged, [plain, matched])).toEqual(['Matched', 'Plain']);
  // With no tags, the nearer of the two comes first.
  expect(order({ x: 0, y: 0 }, [matched, plain])).toEqual(['Plain', 'Matched']);
});

test('Relevance: says how far, to one decimal', () => {
  expect(relevanceOf({ x: 0, y: 0 }, drink('Three-four-five', 3, 4), []).distance).toBe(5);
  expect(relevanceOf({ x: 0, y: 0 }, drink('Root two', 1, 1), []).distance).toBe(1.4);
});

test(`Relevance: a drink you rated 7 or more ranks as if ${LIKED_LIFT} points closer`, () => {
  const liked = drink('Liked', 2.5, 0);
  const nearer = drink('Nearer', 1.2, 0);
  const nearest = drink('Nearest', 0.2, 0);
  // 2.5 away, counted as 0.5: past the drink at 1.2, still behind the one at 0.2.
  expect(order({ x: 0, y: 0 }, [nearest, nearer, liked], [log('Liked', 8)])).toEqual(['Nearest', 'Liked', 'Nearer']);
  // A middling rating lifts nothing.
  expect(order({ x: 0, y: 0 }, [liked, nearer], [log('Liked', 5)])).toEqual(['Nearer', 'Liked']);
});

test('Relevance: a drink you rated 3 or less goes below everything', () => {
  const disliked = drink('Disliked', 0, 0, { tags: ['classic', 'social'] });
  const farthest = drink('Farthest', 10, 10);
  expect(order(tagged, [disliked, farthest], [log('Disliked', 2)])).toEqual(['Farthest', 'Disliked']);
});

test('Relevance: among liked drinks about as close, one liked at this bar comes first, at this bar only', () => {
  // Both were rated 8, so both are lifted alike; only the bar tells them apart.
  const here = drink('Liked here', 0.6, 0);
  const home = drink('Liked at home', 0.2, 0);
  const logs = [log('Liked here', 8, 'The Nomad Bar'), log('Liked at home', 8)];
  expect(order({ x: 0, y: 0 }, [home, here], logs, 'The Nomad Bar')).toEqual(['Liked here', 'Liked at home']);
  expect(order({ x: 0, y: 0 }, [here, home], logs, 'Sage Apothecary')).toEqual(['Liked at home', 'Liked here']);
});

test('Relevance: trained tolerances sort within the band; an untrained filter changes nothing', () => {
  const bitter = drink('Test Negroni', 0.5, 0, { isBitter: true });
  const sweet = drink('Test Daiquiri', 0.3, 0);
  const at = (bitterTolerance: number, eventCount: number) => ({
    x: 0,
    y: 0,
    tolerances: { bitter: bitterTolerance, tannin: 5, complexity: 5, eventCount },
  });
  expect(order(at(9, 0), [bitter, sweet])).toEqual(['Test Daiquiri', 'Test Negroni']);
  expect(relevanceOf(at(9, 0), bitter, []).rank).toBe(relevanceOf({ x: 0, y: 0 }, bitter, []).rank);
  expect(relevanceOf(at(9, 4), bitter, []).rank).toBeLessThan(relevanceOf({ x: 0, y: 0 }, bitter, []).rank);
  expect(relevanceOf(at(1, 4), bitter, []).rank).toBeGreaterThan(relevanceOf({ x: 0, y: 0 }, bitter, []).rank);
});

test('Relevance: everything that sorts within a band together never reaches the next band', () => {
  // The most a drink can gain inside its band (every tag, a good pour at this
  // bar, the most favourable trained tolerances) against the most a drink one
  // band nearer can lose: the nearer one still comes first.
  const tolerances = (t: number) => ({ bitter: t, tannin: t, complexity: 5, eventCount: 9 });
  const fond = { x: 0, y: 0, vibeTags: { classic: 5 }, tolerances: tolerances(10) };
  const averse = { x: 0, y: 0, tolerances: tolerances(0) };
  const props = { isBitter: true, hasSmoke: true } as const;
  const farther = drink('Farther', RELEVANCE_BAND + LIKED_LIFT + 0.05, 0, { tags: ['classic'], ...props });
  const nearer = drink('Nearer', RELEVANCE_BAND - 0.05, 0, props);
  const best = relevanceOf(fond, farther, [log('Farther', 9, 'Here')], 'Here');
  const worst = relevanceOf(averse, nearer, []);
  expect(worst.rank).toBeLessThan(best.rank);
});

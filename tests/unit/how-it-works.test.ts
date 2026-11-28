import { test, expect } from 'vitest';
import { howItWorks } from '../../src/lib/copy';
import { MAX_QUESTIONS, MIN_QUESTIONS } from '../../src/lib/palate/belief-state';
import { MAX_POUR_STEP, applyPour, createInitialPalateState, projectTo2D } from '../../src/lib/palate/palate-state';
import { drinkDatabase } from '../../src/lib/drinks/data';
import { DISLIKED_AT } from '../../src/lib/palate/scoring';
import { buildTerrain, drinkHeight, KIN_ACROSS } from '../../src/lib/palate/terrain';

/**
 * How it works (the front door's card, `/?about=1#how-it-works`) explains, in public, how answers and ratings move a
 * coordinate. A page like that is only worth having if it is true, so its
 * numbers are held to the code's here: change a constant and this fails
 * until the copy says the new thing.
 */

const text = (section: string) =>
  howItWorks.sections.find((s) => s.id === section)!.paragraphs.join(' ');

test('How it works: the question counts are the selector’s', () => {
  const questions = text('questions');
  expect(questions).toContain(`The first ${MIN_QUESTIONS} questions are the same for everyone`);
  expect(questions).toContain(`never fewer than ${MIN_QUESTIONS}, never more than ${MAX_QUESTIONS}`);
});

test('How it works: the rating rules are the ones a pour applies', () => {
  const ratings = text('ratings');
  // "a tenth of the way across": the chart is 20 units wide.
  expect(MAX_POUR_STEP / 20).toBe(0.1);
  expect(ratings).toContain('a tenth of the way across the chart');

  // 7 or more pulls, 3 or less pushes, in between stays.
  expect(ratings).toContain('A 7 or higher pulls your point toward that drink, a 3 or lower pushes it away');
  const prior = createInitialPalateState({ x: 0, y: 0 });
  const far = drinkDatabase.find((d) => Math.hypot(d.x, d.y) > 5)!;
  const distanceAfter = (hedonic: number) => {
    const p = projectTo2D(applyPour(prior, far, { hedonic }));
    return Math.hypot(far.x - p.x, far.y - p.y);
  };
  const start = Math.hypot(far.x, far.y);
  expect(distanceAfter(7)).toBeLessThan(start);
  expect(distanceAfter(3)).toBeGreaterThan(start);
  for (const h of [4, 5, 6]) expect(distanceAfter(h), String(h)).toBeCloseTo(start, 9);
});


test('How it works: the menu is said the way relevanceOf ranks it', () => {
  const menu = howItWorks.sections.find((s) => s.id === 'menu')!.paragraphs.join(' ');
  expect(menu).toContain(`Anything you rated ${DISLIKED_AT} or less last time comes off your menu`);
  // "less again about a different kind of drink"
  expect(KIN_ACROSS).toBeLessThan(1);
  expect(menu).toContain('less again about a different kind of drink');
  // "most about the drink itself and less about its neighbours"
  const byName = (n: string) => drinkDatabase.find((d) => d.name === n)!;
  const t = buildTerrain({ x: 0, y: 0 }, [{ drink: { name: 'Negroni' }, rating: { hedonic: 9 } }]);
  expect(drinkHeight(t, byName('Negroni')).rating).toBeGreaterThan(drinkHeight(t, byName('Bijou')).rating);
  expect(menu).toContain('A rating says most about the drink itself and less about its neighbours');
});

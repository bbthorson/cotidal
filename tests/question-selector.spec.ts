import { test, expect } from '@playwright/test';
import { createInitialBelief, updateBelief } from '../src/lib/belief-state';
import { selectNextQuestion, expectedGain } from '../src/lib/question-selector';
import { questions, type Question } from '../src/lib/discovery-questions';

/**
 * The selector's contract, not its path: what makes a question worth asking.
 * Which question comes fifth depends on the answers, so no test names it.
 */

const synthetic = (options: Question['options']): Question => ({
  id: 'synthetic',
  tier: 'architecture',
  category: 'palate',
  sectionNumber: '00',
  text: 'synthetic',
  primaryAxis: 'x',
  options,
});

test('Selector: a question whose answers all place you alike tells us nothing', async () => {
  const same = synthetic([
    { text: 'a', dx: 2, dy: 0 },
    { text: 'b', dx: 2, dy: 0 },
  ]);
  const apart = synthetic([
    { text: 'a', dx: -4, dy: 0 },
    { text: 'b', dx: 4, dy: 0 },
  ]);
  const belief = createInitialBelief();
  expect(expectedGain(belief, same)).toBeCloseTo(0, 10);
  expect(expectedGain(belief, apart)).toBeGreaterThan(0);
});

test('Selector: a question that can settle an open aversion is worth more', async () => {
  const flagged = synthetic([
    { text: 'a', dx: -4, dy: 0, filterFlag: { key: 'dislikesSmoke', value: true } },
    { text: 'b', dx: 4, dy: 0, filterFlags: { dislikesSmoke: false } },
  ]);
  const plain = synthetic(flagged.options.map(({ text, dx, dy }) => ({ text, dx, dy })));

  const open = createInitialBelief();
  expect(expectedGain(open, flagged)).toBeGreaterThan(expectedGain(open, plain));

  const settled = { ...open, filters: { ...open.filters, dislikesSmoke: false } };
  expect(expectedGain(settled, flagged)).toBeCloseTo(expectedGain(settled, plain), 10);
});

test('Selector: an axis already pinned down is worth less to ask about', async () => {
  const onX = synthetic([
    { text: 'a', dx: -4, dy: 0 },
    { text: 'b', dx: 4, dy: 0 },
  ]);
  let sure = createInitialBelief();
  for (let i = 0; i < 6; i++) sure = updateBelief(sure, { text: 'x', dx: 3, dy: 0 });
  expect(expectedGain(sure, onX)).toBeLessThan(expectedGain(createInitialBelief(), onX));
});

test('Selector: never repeats a question and runs out cleanly', async () => {
  let belief = createInitialBelief();
  const asked = new Set<string>();
  for (let i = 0; i < questions.length; i++) {
    const q = selectNextQuestion(belief, asked);
    expect(q).not.toBeNull();
    expect(asked.has(q!.id)).toBe(false);
    asked.add(q!.id);
    belief = updateBelief(belief, q!.options[i % q!.options.length]);
  }
  expect(selectNextQuestion(belief, asked)).toBeNull();
});

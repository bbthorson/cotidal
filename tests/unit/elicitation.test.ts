import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createInitialBelief, answerQuestion, RESPONSE_MODEL } from '../../src/lib/belief-state';
import { selectNextQuestion } from '../../src/lib/question-selector';
import { questions, type Question } from '../../src/lib/discovery-questions';
import { toElicitationRecord } from '../../src/lib/elicitation';
import { ELICITATION_COLLECTION, ElicitationRecordSchema } from '../../src/lib/atproto/records';

/**
 * Logged answers (app.cotidal.elicitation): what each question offered
 * and which option was taken, so the response model can be calibrated later
 * against the same person's pours.
 */

const lexicon = JSON.parse(
  readFileSync('src/lib/atproto/lexicons/app.cotidal.elicitation.json', 'utf8')
);

/** Take option `pick(i)` at each step until the quiz has asked `n` questions. */
function answerQuiz(n: number, pick: (i: number, q: Question) => number) {
  let belief = createInitialBelief();
  const asked = new Set<string>();
  const taken: { id: string; index: number }[] = [];
  for (let i = 0; i < n; i++) {
    const q = selectNextQuestion(belief, asked)!;
    asked.add(q.id);
    const index = pick(i, q);
    taken.push({ id: q.id, index });
    belief = answerQuestion(belief, q, q.options[index]);
  }
  return { belief, taken };
}

test('Answers: every question is logged as asked, in order, with what was offered', () => {
  const { belief, taken } = answerQuiz(6, (i, q) => i % q.options.length);
  const record = toElicitationRecord(belief.responses, '2026-10-25T12:00:00.000Z');

  expect(record).not.toBeNull();
  expect(record!.$type).toBe(ELICITATION_COLLECTION);
  expect(record!.responseModel).toBe(RESPONSE_MODEL);
  expect(record!.answers.map((a) => a.questionId)).toEqual(taken.map((t) => t.id));
  record!.answers.forEach((a, i) => {
    const q = questions.find((q) => q.id === a.questionId)!;
    expect(a.chosen).toBe(taken[i].index);
    // The options as authored, so the bank can change without losing what was asked.
    expect(a.options).toEqual(q.options.map((o) => ({ dxTenths: o.dx * 10, dyTenths: o.dy * 10 })));
  });
  expect(ElicitationRecordSchema.safeParse(record).success).toBe(true);
});

test('Answers: an answer that carries no position is still logged', () => {
  // A question that only settles an aversion moves nothing on the map, but
  // which option was taken is still part of what the person said.
  const flagOnly: Question = {
    id: 'flag_only',
    tier: 'context',
    category: 'palate',
    sectionNumber: '01',
    text: 'flag only',
    primaryAxis: 'x',
    options: [
      { text: 'yes', dx: 0, dy: 0, filterFlag: { key: 'dislikesSmoke', value: true } },
      { text: 'no', dx: 0, dy: 0, filterFlag: { key: 'dislikesSmoke', value: false } },
    ],
  };
  const belief = answerQuestion(createInitialBelief(), flagOnly, flagOnly.options[1]);
  expect(belief.answers).toHaveLength(0);
  expect(belief.responses).toEqual([
    { questionId: 'flag_only', kind: 'single', generated: false, options: [{ dx: 0, dy: 0 }, { dx: 0, dy: 0 }], chosen: 1 },
  ]);
});

test('Answers: every number is an integer, because the data model has no floats', () => {
  // A generated question can carry fractional nudges; they are kept in tenths.
  const generated: Question = {
    id: 'ai_1',
    tier: 'context',
    category: 'palate',
    sectionNumber: '01',
    text: 'generated',
    isAIGenerated: true,
    primaryAxis: 'x',
    options: [
      { text: 'a', dx: 1.25, dy: -0.333 },
      { text: 'b', dx: -2.5, dy: 7 },
    ],
  };
  const belief = answerQuestion(createInitialBelief(), generated, generated.options[1]);
  const record = toElicitationRecord(belief.responses)!;
  expect(record.answers[0]).toMatchObject({
    generated: true,
    options: [
      { dxTenths: 13, dyTenths: -3 },
      { dxTenths: -25, dyTenths: 70 },
    ],
    chosen: 1,
  });

  const numbers: unknown[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'number') numbers.push(v);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(record);
  expect(numbers.length).toBeGreaterThan(0);
  for (const n of numbers) expect(Number.isInteger(n), String(n)).toBe(true);
});

test('Answers: nothing to log is no record, and a bad index is refused', () => {
  expect(toElicitationRecord([])).toBeNull();
  const bad = ElicitationRecordSchema.safeParse({
    $type: ELICITATION_COLLECTION,
    responseModel: RESPONSE_MODEL,
    answers: [{ questionId: 'x', options: [{ dxTenths: 0, dyTenths: 10 }], chosen: 1 }],
    createdAt: new Date().toISOString(),
  });
  expect(bad.success).toBe(false);
});

test('Answers: the lexicon and the Zod schema describe the same record', () => {
  const main = lexicon.defs.main.record;
  const answer = lexicon.defs.answer;
  const option = lexicon.defs.option;

  expect(Object.keys(main.properties).sort()).toEqual(
    Object.keys(ElicitationRecordSchema.shape).filter((k) => k !== '$type').sort()
  );
  expect(main.required.sort()).toEqual(['answers', 'createdAt', 'responseModel']);
  expect(Object.keys(answer.properties).sort()).toEqual(['chosen', 'generated', 'kind', 'options', 'questionId']);
  expect(answer.required.sort()).toEqual(['chosen', 'options', 'questionId']);
  expect(Object.keys(option.properties).sort()).toEqual(['dxTenths', 'dyTenths']);
  expect(main.properties.responseModel.knownValues).toContain(RESPONSE_MODEL);

  // No `number` anywhere in the lexicon: integers only.
  const types: string[] = [];
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if (typeof o.type === 'string') types.push(o.type);
      Object.values(o).forEach(walk);
    }
  };
  walk(lexicon.defs);
  expect(types).not.toContain('number');
});


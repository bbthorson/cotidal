import { test, expect } from '@playwright/test';
import { createInitialBelief, answerQuestion } from '../src/lib/belief-state';
import { selectNextQuestion } from '../src/lib/question-selector';
import { type Question } from '../src/lib/discovery-questions';
import { toElicitationRecord } from '../src/lib/elicitation';
import { ElicitationRecordSchema } from '../src/lib/atproto/records';

/**
 * Logged answers (app.cotidal.elicitation): what each question offered
 * and which option was taken, so the response model can be calibrated later
 * against the same person's pours.
 */

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

test('Answers route: a guest cannot write answers', async ({ request }) => {
  const res = await request.post('/api/atproto-publish', {
    data: {
      action: 'publishElicitation',
      record: toElicitationRecord(answerQuiz(4, () => 0).belief.responses),
    },
  });
  expect(res.status()).toBe(401);
  expect((await res.json()).success).toBe(false);
});

test('Answers: a guest who finishes the quiz keeps the answers on the device', async ({ page }) => {
  await page.goto('/map?quiz=1');

  // The path is adaptive: take the first plate until the reveal appears.
  const reveal = page.getByText('Your coordinate lands in');
  let asked = 0;
  for (let i = 0; i < 10 && !(await reveal.isVisible()); i++) {
    const heading = await page.getByRole('heading', { level: 1 }).textContent();
    await page.getByRole('group', { name: 'Answer options' }).getByRole('button').first().click();
    asked++;
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(heading ?? '');
  }
  await expect(reveal).toBeVisible();

  // The write fails for a guest, so the record waits for them to sign in.
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('pending_elicitation')))
    .not.toBeNull();
  const pending = JSON.parse((await page.evaluate(() => localStorage.getItem('pending_elicitation')))!);
  expect(ElicitationRecordSchema.safeParse(pending).success).toBe(true);
  expect(pending.answers).toHaveLength(asked);
  expect(pending.answers.every((a: { chosen: number }) => a.chosen === 0)).toBe(true);
});

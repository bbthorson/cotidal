import { expect, type Page } from '@playwright/test';

/**
 * The tasting flow opens with a freeform prompt ("What are you in the mood
 * for tonight?") and only starts the question sequence once that is answered.
 *
 * Nothing here needs a model: `useBartenderChat` serves canned copy from
 * `src/lib/conversation.ts`, so the flow is deterministic offline. Note that
 * only the first three questions are a fixed calibration sequence — after
 * that `question-selector` picks adaptively, so tests must not hard-code a
 * path through the quiz.
 */
export async function startQuiz(page: Page, opener = 'Something bitter and cold.') {
  await page.goto('/taste');
  await expect(page.getByText('What are you in the mood for tonight?')).toBeVisible();

  const input = page.getByRole('textbox');
  await input.fill(opener);
  await input.press('Enter');

  await expect(page.getByTestId('quick-reply').first()).toBeVisible({ timeout: 15_000 });
}

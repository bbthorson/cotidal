import { test, expect } from '@playwright/test';

/**
 * The tasting flow is being reworked (different elicitation UX per stage), so
 * this covers only the contract that should survive that: the app opens with
 * a freeform prompt and does not present options until it is answered.
 *
 * The scoring behaviour underneath is covered directly, without a browser,
 * in `belief-state.spec.ts` — that is where question-order-independent
 * assertions belong.
 */

test('Quiz: opens with a freeform prompt, no options until answered', async ({ page }) => {
  await page.goto('/taste');

  await expect(page.getByText('What are you in the mood for tonight?')).toBeVisible();
  await expect(page.getByTestId('quick-reply')).toHaveCount(0);
  await expect(page.getByRole('textbox')).toBeEnabled();
});

test('Quiz: browsing skips straight to the map', async ({ page }) => {
  await page.goto('/taste?browse=1');
  await expect(page.getByText('What are you in the mood for tonight?')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /start over/i })).toBeVisible();
});

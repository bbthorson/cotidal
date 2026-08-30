import { test, expect } from '@playwright/test';

test('Quiz: Should render options and show enriched feedback on click', async ({ page }) => {
  await page.goto('/taste');

  // The first question is "How do you take your coffee?"
  await expect(page.locator('text=How do you take your coffee?')).toBeVisible();

  // Two answer choices should be visible
  const options = page.locator('button').filter({ hasText: /Black|With milk/ });
  await expect(options).toHaveCount(2);

  await page.click('text=Black or Espresso.');

  // Enriched feedback should appear in the conversation thread
  await expect(page.locator('text=Black coffee, no nonsense.')).toBeVisible();
});

import { test, expect } from '@playwright/test';

test('Binary Question Card: Should have aria-keyshortcuts for screen readers', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Begin the Reading');

  // The first question is "How do you take your coffee?" (Binary)
  await expect(page.locator('text=How do you take your coffee?')).toBeVisible();

  // Find the two option buttons
  const options = page.locator('button').filter({ hasText: /Black|With milk/ });
  await expect(options).toHaveCount(2);

  // Check the first option (should be Left/Black)
  const firstOption = options.first();
  await expect(firstOption).toHaveAttribute('aria-keyshortcuts', 'ArrowLeft');

  // Check the second option (should be Right/Milk)
  const secondOption = options.last();
  await expect(secondOption).toHaveAttribute('aria-keyshortcuts', 'ArrowRight');
});

import { test, expect } from '@playwright/test';

test('Binary Question Card: Should render two options and respond to click', async ({ page }) => {
  // We'll test this component in isolation if possible, or via the quiz flow.
  await page.goto('/');
  await page.click('text=Begin the Reading');
  
  // The first question is "How do you take your coffee?"
  await expect(page.locator('text=How do you take your coffee?')).toBeVisible();
  
  const options = page.locator('button');
  await expect(options).toHaveCount(2);
  
  await page.click('text=Black or Espresso.');
  // Check if it proceeds to the next question (or shows feedback)
});

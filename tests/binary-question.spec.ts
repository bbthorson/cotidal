import { test, expect } from '@playwright/test';

test('Binary Question Card: Should render two options and respond to click', async ({ page }) => {
  // We'll test this component in isolation if possible, or via the quiz flow.
  await page.goto('/');
  await page.click('text=Begin the Reading');
  
  // The first question is "How do you take your coffee?"
  await expect(page.locator('text=How do you take your coffee?')).toBeVisible();
  
  // Use a more specific locator to avoid finding other buttons (like hidden dialog triggers or tooltips)
  // We look for buttons that contain the expected option text
  const options = page.locator('button').filter({ hasText: /Black|With milk/ });
  await expect(options).toHaveCount(2);
  
  await page.click('text=Black or Espresso.');
  // Check if it proceeds to the next question (or shows feedback)
  // Since we have feedback delay, we can check for feedback or next question
  // "A preference for the pure and bold." is the feedback for Black coffee.
  await expect(page.locator('text=A preference for the pure and bold.')).toBeVisible();
});

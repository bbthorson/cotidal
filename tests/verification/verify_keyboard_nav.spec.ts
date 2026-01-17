import { test, expect } from '@playwright/test';

test('Binary Question Card: Should respond to Up/Down keyboard navigation', async ({ page }) => {
  // Test ArrowUp -> Option 1
  await page.goto('/');
  await page.click('text=Begin the Reading');
  await expect(page.locator('text=How do you take your coffee?')).toBeVisible();

  // Press ArrowUp (should select first option: Black or Espresso)
  await page.keyboard.press('ArrowUp');

  // Feedback for first option
  await expect(page.locator('text=A preference for the pure and bold.')).toBeVisible();

  // Reload to test ArrowDown
  await page.goto('/');
  await page.click('text=Begin the Reading');
  await expect(page.locator('text=How do you take your coffee?')).toBeVisible();

  // Press ArrowDown (should select second option: With milk and sugar)
  await page.keyboard.press('ArrowDown');

  // Feedback for second option
  await expect(page.locator('text=Seeking comfort and sweetness.')).toBeVisible();

  // Take screenshot for verification
  await page.screenshot({ path: 'verification-keyboard-nav.png' });
});

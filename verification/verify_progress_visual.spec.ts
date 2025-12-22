import { test, expect } from '@playwright/test';

test('verify quiz progress bar visually', async ({ page }) => {
  await page.goto('http://localhost:9002/');
  await page.click('text=Start Tasting');

  // Wait for animation
  await page.waitForTimeout(1000);

  // Take screenshot of the progress bar area
  // The progress bar is inside a card header
  const cardHeader = page.locator('.space-y-6.min-h-\[400px\]').locator('..').locator('.space-y-2');

  // Or just screenshot the whole card
  const card = page.locator('.shadow-2xl');

  await expect(card).toBeVisible();
  await card.screenshot({ path: 'verification/progress_step_1.png' });

  // Advance one step
  await page.click('button:has-text("Black or Espresso")');
  await page.waitForTimeout(1000);
  await card.screenshot({ path: 'verification/progress_step_2.png' });
});

import { test, expect } from '@playwright/test';
import path from 'path';

test('verify aria-keyshortcuts on binary question buttons', async ({ page }) => {
  // 1. Navigate to home
  await page.goto('/');

  // 2. Start Quiz
  // Wait for the button to be visible
  const startButton = page.getByRole('button', { name: 'Begin the Reading' });
  await expect(startButton).toBeVisible();
  await startButton.click();

  // 3. Wait for binary question buttons
  // The first question should be loaded.
  // We check for the presence of the attribute.

  const leftButton = page.locator('button[aria-keyshortcuts="ArrowLeft"]');
  const rightButton = page.locator('button[aria-keyshortcuts="ArrowRight"]');

  await expect(leftButton).toBeVisible({ timeout: 10000 });
  await expect(rightButton).toBeVisible({ timeout: 10000 });

  // Take screenshot
  const screenshotPath = path.resolve(__dirname, 'verification_aria_shortcuts.png');
  await page.screenshot({ path: screenshotPath });

  console.log(`Screenshot saved to ${screenshotPath}`);
});

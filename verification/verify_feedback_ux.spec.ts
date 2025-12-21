import { test, expect } from '@playwright/test';

test('feedback appears in button after selection', async ({ page }) => {
  // Go to home page
  await page.goto('http://localhost:9002');

  // Click Start Tasting
  await page.getByRole('button', { name: 'Start Tasting' }).click();

  // Wait for first question
  await expect(page.getByRole('heading', { name: 'How do you take your coffee?' })).toBeVisible();

  // Find the option button
  const optionButton = page.getByRole('button', { name: 'Black or Espresso.' });

  // Click it
  await optionButton.click();

  // Check if feedback appears within the button
  await expect(optionButton).toHaveText(/Starting bold/, { timeout: 2000 });

  // Wait a bit to ensure visual update is rendered and stable
  await page.waitForTimeout(200);

  // Take screenshot
  await page.screenshot({ path: 'verification/verification.png' });
});

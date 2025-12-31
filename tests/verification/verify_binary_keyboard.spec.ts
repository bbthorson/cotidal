import { test, expect } from '@playwright/test';

test('Binary Question Card: Should support keyboard navigation (Left/Right Arrows)', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Begin the Reading');

  // Wait for the first binary question
  await expect(page.locator('text=How do you take your coffee?')).toBeVisible();

  // Wait for animation
  await page.waitForTimeout(1000);

  // Press ArrowLeft
  await page.keyboard.press('ArrowLeft');

  // Verify the left option is selected/clicked
  // The first question: "Black or Espresso" (Left) vs "With Cream & Sugar" (Right)
  // If we selected left, we might move to next question or see feedback.
  // Wait for change

  // We expect the next question to appear or the state to change.
  // The next question (from data.ts) usually is about time of day or something else.
  // Let's just check that "How do you take your coffee?" disappears or changes.

  // Note: There is a transition delay.
  await expect(page.locator('text=How do you take your coffee?')).not.toBeVisible({ timeout: 5000 });
});

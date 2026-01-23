import { test, expect } from '@playwright/test';

test('verify binary question shortcuts', async ({ page }) => {
  // Clear storage to ensure fresh start
  await page.addInitScript(() => {
    localStorage.clear();
  });

  await page.goto('/');

  // Start the quiz
  await page.getByRole('button', { name: /Begin the Reading/i }).click();

  // Wait for the first question header to confirm quiz started
  await expect(page.locator('h2')).toBeVisible({ timeout: 10000 });

  // Get the option buttons.
  const optionButtons = page.locator('main button');
  await expect(optionButtons.first()).toBeVisible();

  const btn1 = optionButtons.nth(0);
  const btn2 = optionButtons.nth(1);

  // 1. Check for aria-keyshortcuts (POSITIVE assertion)
  await expect(btn1).toHaveAttribute('aria-keyshortcuts', 'ArrowLeft ArrowUp');
  await expect(btn2).toHaveAttribute('aria-keyshortcuts', 'ArrowRight ArrowDown');

  // 2. Check ArrowDown triggers selection (mapped to Option 2)
  await page.keyboard.press('ArrowDown');

  // Verify visual feedback (ring-primary class applied to selected option)
  // We use a short timeout because the transition might be happening
  await expect(btn2).toHaveClass(/ring-primary/, { timeout: 2000 });

  // Note: We can't easily test ArrowUp on the same question because it's already answered.
  // But verifying ArrowDown works and the attributes are present gives high confidence.
});

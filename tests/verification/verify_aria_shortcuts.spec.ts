import { test, expect } from '@playwright/test';

test('verify aria-keyshortcuts and keyboard interaction on binary question', async ({ page }) => {
  // 1. Navigate to the root URL
  await page.goto('/');

  // 2. Click "Begin the Reading"
  await page.click('text="Begin the Reading"');

  // 3. Wait for the quiz to load (look for the first question text)
  await expect(page.getByText('How do you take your coffee?')).toBeVisible({ timeout: 10000 });

  // 4. Locate the option buttons
  const leftButton = page.getByRole('button', { name: /Black or Espresso/i });
  const rightButton = page.getByRole('button', { name: /With milk and sugar/i });

  await expect(leftButton).toBeVisible();
  await expect(rightButton).toBeVisible();

  // 5. Assert aria-keyshortcuts
  await expect(leftButton).toHaveAttribute('aria-keyshortcuts', 'ArrowLeft');
  await expect(rightButton).toHaveAttribute('aria-keyshortcuts', 'ArrowRight');

  // 6. Verify Keyboard Interaction
  // Press ArrowLeft and check if the left button becomes selected
  await page.keyboard.press('ArrowLeft');

  // Logic Check:
  // When selected, isNavigating=true, selectedOptionIndex=0.
  // Left Button: disabled = isNavigating && !isSelected = true && false = false (ENABLED)
  // Right Button: disabled = isNavigating && !isSelected = true && true = true (DISABLED)

  await expect(rightButton).toBeDisabled();
  // Left button should stay enabled but show feedback
  await expect(leftButton).toBeEnabled();

  // Verify the feedback appears.
  // The "Black or Espresso" option has feedback: "A preference for the pure and bold."
  await expect(page.getByText('A preference for the pure and bold.')).toBeVisible();

});

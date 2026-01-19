
import { test, expect } from '@playwright/test';

test('Verify BinaryQuestionCard keyboard shortcuts', async ({ page }) => {
  // Go to the home page
  await page.goto('http://localhost:9002');

  // Wait for the start button
  await page.waitForTimeout(1000);

  // Start the quiz
  await page.getByRole('button', { name: 'Begin the Reading' }).click();

  // Wait for the first question: "How do you take your coffee?"
  const firstQuestion = page.getByRole('heading', { level: 2, name: "How do you take your coffee?" });
  await expect(firstQuestion).toBeVisible();

  // Get options
  // Option 1: Black or Espresso.
  // Option 2: With milk and sugar.
  // Use more specific locators if name matching is flaky
  const buttons = page.getByRole('button');
  const option1 = buttons.filter({ hasText: /Black or Espresso/ });
  const option2 = buttons.filter({ hasText: /With milk and sugar/ });

  await expect(option1).toBeVisible();
  await expect(option2).toBeVisible();

  // Take screenshot to verify visual hints
  await page.screenshot({ path: 'verification/keyboard_shortcuts.png' });

  // 1. Verify aria-keyshortcuts
  await expect(option1).toHaveAttribute('aria-keyshortcuts', 'ArrowLeft ArrowUp');
  await expect(option2).toHaveAttribute('aria-keyshortcuts', 'ArrowRight ArrowDown');

  // 2. Verify ArrowUp selects Option 1
  // We need to trigger the keydown event.
  await page.keyboard.press('ArrowUp');

  // We check if we moved to the next question, which confirms selection worked.
  // Using a longer timeout just in case of animation delays, though default 5s is usually enough.
  await expect(page.getByText('Pick a finish to a perfect meal.')).toBeVisible();

  // Now we are at Q2 (3 options). Answer it to get to Q3.
  await page.getByRole('button', { name: 'Lemon Tart' }).click();

  // Now we are at Q3: "Do you enjoy the bite of Tonic water?"
  await expect(page.getByText('Do you enjoy the bite of Tonic water?')).toBeVisible();

  // Option 1: "Love the bite."
  // Option 2: "Too bitter for me."
  // We don't need locators to press arrow keys, just to verify effect (navigation).

  // 3. Verify ArrowDown selects Option 2
  await page.keyboard.press('ArrowDown');

  // Check if we moved to next question.
  // Next question is "How do you handle spice?" (3 options) or something else?
  // Actually, checking if the current question disappears is enough.
  await expect(page.getByText('Do you enjoy the bite of Tonic water?')).toBeHidden();

});

import { test, expect } from '@playwright/test';

test('Verify BinaryQuestionCard keyboard shortcuts and ARIA', async ({ page }) => {
  // Go to the home page
  await page.goto('http://localhost:9002');

  // Start the quiz
  await page.getByRole('button', { name: 'Begin the Reading' }).click();

  // Wait for the first question (Coffee)
  const firstQuestion = page.getByRole('heading', { level: 2 });
  await expect(firstQuestion).toHaveText("How do you take your coffee?");

  // Get the two options
  // Option 1: Black or Espresso.
  // Option 2: With milk and sugar.
  const option1 = page.getByRole('button', { name: /Black or Espresso/i });
  const option2 = page.getByRole('button', { name: /With milk and sugar/i });

  // Verify aria-keyshortcuts are present
  await expect(option1).toHaveAttribute('aria-keyshortcuts', 'ArrowLeft');
  await expect(option2).toHaveAttribute('aria-keyshortcuts', 'ArrowRight');

  // Verify ArrowLeft works
  // Ensure we are focused on the body or the container
  await page.keyboard.press('ArrowLeft');

  // Expect to advance to the next question
  // Second question: "Pick a finish to a perfect meal."
  const secondQuestion = page.getByRole('heading', { level: 2 });
  await expect(secondQuestion).toBeVisible({ timeout: 5000 });
  await expect(secondQuestion).toHaveText("Pick a finish to a perfect meal.");
});

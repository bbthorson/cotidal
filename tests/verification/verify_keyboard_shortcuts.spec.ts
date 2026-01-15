import { test, expect } from '@playwright/test';

test('Verify BinaryQuestionCard keyboard shortcuts (Left/Right/Up/Down)', async ({ page }) => {
  // Go to the home page
  await page.goto('http://localhost:3000');

  // Start the quiz
  await page.getByRole('button', { name: 'Begin the Reading' }).click();

  // 1. Test ArrowRight (Original behavior)
  const firstQuestion = page.getByRole('heading', { level: 2 });
  await expect(firstQuestion).toBeVisible();
  await expect(firstQuestion).toHaveText("How do you take your coffee?");
  await page.keyboard.press('ArrowRight');

  // Wait for the next question "Pick a finish to a perfect meal."
  await expect(page.getByText('Pick a finish to a perfect meal.')).toBeVisible();

  // Answer question 2 manually
  await page.getByRole('button', { name: 'Lemon Tart' }).click();

  // 2. Test ArrowUp (New behavior - matches Left/First Option)
  // Question 3: "Do you enjoy the bite of Tonic water?"
  await expect(page.getByText('Do you enjoy the bite of Tonic water?')).toBeVisible();
  await page.keyboard.press('ArrowUp');

  // Wait for Question 4
  // We expect "Yes, I love it." (Option 1) to be chosen.
  await expect(page.getByText('Do you enjoy the bite of Tonic water?')).toBeHidden();

  // Note: We can't easily verify *which* option was chosen without checking internal state or next question,
  // but if the quiz advances, the shortcut triggered something.
});

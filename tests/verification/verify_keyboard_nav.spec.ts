import { test, expect } from '@playwright/test';

test('Verify BinaryQuestionCard keyboard navigation and ARIA attributes', async ({ page }) => {
  await page.goto('http://localhost:9002');
  await page.getByRole('button', { name: 'Begin the Reading' }).click();

  const firstQuestion = page.getByRole('heading', { level: 2 });
  await expect(firstQuestion).toBeVisible({ timeout: 10000 });
  await expect(firstQuestion).toHaveText("How do you take your coffee?");

  // Verify ARIA keyshortcuts
  const option1 = page.getByRole('button', { name: /Black/i });
  await expect(option1).toBeVisible();
  await expect(option1).toHaveAttribute('aria-keyshortcuts', 'ArrowLeft ArrowUp');

  // "With milk and sugar."
  const option2 = page.getByRole('button', { name: /milk/i });
  await expect(option2).toBeVisible();
  await expect(option2).toHaveAttribute('aria-keyshortcuts', 'ArrowRight ArrowDown');

  // Take a screenshot of the initial state with proper attributes
  await page.screenshot({ path: 'tests/verification/binary_question_initial.png' });

  // Verify ArrowDown navigation (selects option 2)
  await page.keyboard.press('ArrowDown');
  await expect(page.getByText('Pick a finish to a perfect meal.')).toBeVisible({ timeout: 10000 });

  // Take a screenshot after navigation
  await page.screenshot({ path: 'tests/verification/binary_question_navigated.png' });
});

test('Verify BinaryQuestionCard ArrowUp navigation', async ({ page }) => {
  await page.goto('http://localhost:9002');
  await page.getByRole('button', { name: 'Begin the Reading' }).click();

  const firstQuestion = page.getByRole('heading', { level: 2 });
  await expect(firstQuestion).toBeVisible({ timeout: 10000 });

  // Press ArrowUp to select the first option
  await page.keyboard.press('ArrowUp');
  await expect(page.getByText('Pick a finish to a perfect meal.')).toBeVisible({ timeout: 10000 });
});

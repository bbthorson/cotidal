
import { test, expect } from '@playwright/test';

test('Verify BinaryQuestionCard focus management', async ({ page }) => {
  // Go to the home page
  await page.goto('http://localhost:9002');

  // Wait for the start button
  await page.waitForTimeout(1000);

  // Start the quiz
  await page.getByRole('button', { name: 'Begin' }).click();

  // Wait for the first question
  // First question is: "How do you take your coffee?"
  const firstQuestion = page.getByRole('heading', { level: 2 });
  await expect(firstQuestion).toBeVisible();
  await expect(firstQuestion).toHaveText("How do you take your coffee?");

  // Check that the heading has tabIndex="-1" (part of our fix)
  await expect(firstQuestion).toHaveAttribute('tabindex', '-1');

  // Click the first option: "Black or Espresso."
  // Note: The text in the button might be broken up by spans, so getByRole('button') with partial text match is safer,
  // or use the exact text if we know it.
  await page.getByRole('button', { name: 'Black or Espresso.' }).click();

  // Wait for the next question
  // Second question: "Pick a finish to a perfect meal."
  // This is a 3-option question, so it is NOT a BinaryQuestionCard in DiscoveryQuiz.tsx logic.
  // DiscoveryQuiz logic: currentQuestion.options.length === 2 ? BinaryQuestionCard : default div

  // Let's check the next question.
  // "Pick a finish to a perfect meal." has 3 options.
  await expect(page.getByText('Pick a finish to a perfect meal.')).toBeVisible();

  // Verify focus moved to the heading of the NEW question
  const secondQuestion = page.getByRole('heading', { level: 2 });
  await expect(secondQuestion).toBeFocused();
  await expect(secondQuestion).toHaveText("Pick a finish to a perfect meal.");

  // Now let's go to a Binary Question again to verify the specific component fix.
  // Question 3: "Do you enjoy the bite of Tonic water?" (2 options)

  // Answer question 2 (Pick "Lemon Tart")
  await page.getByRole('button', { name: 'Lemon Tart' }).click();

  // Wait for Question 3
  await expect(page.getByText('Do you enjoy the bite of Tonic water?')).toBeVisible();

  // Verify focus on Question 3 (BinaryQuestionCard)
  const thirdQuestion = page.getByRole('heading', { level: 2 });
  await expect(thirdQuestion).toBeFocused();
  await expect(thirdQuestion).toHaveText("Do you enjoy the bite of Tonic water?");

  await page.screenshot({ path: 'verification/focus_verification.png' });
});

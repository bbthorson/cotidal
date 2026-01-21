import { test, expect } from '@playwright/test';

test.describe('Binary Question Card Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Start the quiz
    await page.click('text=Begin the Reading');
    // Wait for the first question
    await expect(page.locator('text=How do you take your coffee?')).toBeVisible();
  });

  test('should support ArrowLeft for the first option', async ({ page }) => {
    // ArrowLeft should select the first option (Option 0)
    await page.keyboard.press('ArrowLeft');
    // Check for feedback associated with the first option ("Black or Espresso")
    // Feedback: "A preference for the pure and bold."
    await expect(page.locator('text=A preference for the pure and bold.')).toBeVisible();
  });

  test('should support ArrowRight for the second option', async ({ page }) => {
    // ArrowRight should select the second option (Option 1)
    await page.keyboard.press('ArrowRight');
    // Check for feedback associated with the second option ("With milk/sugar")
    // Feedback: "Seeking comfort and sweetness."
    await expect(page.locator('text=Seeking comfort and sweetness.')).toBeVisible();
  });

  test('should support ArrowUp for the first option (Mobile Vertical Layout)', async ({ page }) => {
    // ArrowUp should select the first option (Option 0)
    await page.keyboard.press('ArrowUp');
    // Check for feedback associated with the first option
    await expect(page.locator('text=A preference for the pure and bold.')).toBeVisible();
  });

  test('should support ArrowDown for the second option (Mobile Vertical Layout)', async ({ page }) => {
    // ArrowDown should select the second option (Option 1)
    await page.keyboard.press('ArrowDown');
    // Check for feedback associated with the second option
    await expect(page.locator('text=Seeking comfort and sweetness.')).toBeVisible();
  });
});

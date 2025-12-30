import { test, expect } from '@playwright/test';

test.describe('Binary Question Card', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('text=Begin the Reading');
  });

  test('Should render two options and respond to click', async ({ page }) => {
    // The first question is "How do you take your coffee?"
    await expect(page.locator('text=How do you take your coffee?')).toBeVisible();

    // Scope to the main card content to avoid picking up header/footer buttons
    const quizCard = page.locator('.glass-dark');
    const options = quizCard.locator('button');

    await expect(options.first()).toBeVisible();
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(2);

    await page.click('text=Black or Espresso.');
  });

  test('Should respond to keyboard arrows', async ({ page }) => {
    // Question 1: How do you take your coffee? (Binary)
    await expect(page.locator('text=How do you take your coffee?')).toBeVisible();

    // Press ArrowLeft (should select "Black or Espresso.")
    await page.keyboard.press('ArrowLeft');

    // Verify selection visual state (the button should have ring-2 class)
    const firstButton = page.locator('button').filter({ hasText: 'Black or Espresso.' });
    await expect(firstButton).toHaveClass(/ring-2/);

    // Question 2: Pick a finish to a perfect meal. (Trinary - NOT Binary)
    await expect(page.locator('text=Pick a finish to a perfect meal.')).toBeVisible({ timeout: 10000 });

    // This question is NOT binary (3 options), so keyboard nav shouldn't trigger anything by default (or might be ignored)
    // Let's manually advance past this one to test another binary question if needed.
    await page.click('text=Lemon Tart');

    // Question 3: Do you enjoy the bite of Tonic water? (Binary)
    await expect(page.locator('text=Do you enjoy the bite of Tonic water?')).toBeVisible();

    // Press ArrowRight (should select "Too bitter for me.")
    await page.keyboard.press('ArrowRight');

    const secondButton = page.locator('button').filter({ hasText: 'Too bitter for me.' });
    await expect(secondButton).toHaveClass(/ring-2/);

    // Question 4: Fizzy or Still? (Binary)
    await expect(page.locator('text=Fizzy or Still?')).toBeVisible({ timeout: 10000 });
  });
});

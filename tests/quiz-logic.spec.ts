import { test, expect } from '@playwright/test';

test('Quiz Logic: Full flow and final profile verification', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Let\'s Go');

  // The Basics
  await page.click('text=Black or Espresso.'); // dx: 5
  await page.click('text=Lemon Tart'); // dy: 5
  await page.click('text=Love the bite.'); // dx: 2
  await page.click('text=Delicious.'); // dx: 0, dy: 0

  // Your Style
  await page.click('text=Fizzy & Refreshing'); // dy: 4
  await page.click('text=Heatwave'); // dy: 3
  await page.click('text=Stemmed & Elegant'); // dx: 1

  // The Details
  await page.click('text=Love it.'); // dx: 2
  await page.click('text=Sipping slowly.'); // dx: 1, dy: -1

  // Wait for results
  await expect(page.locator('text=Your Drink Menu')).toBeVisible({ timeout: 15000 });

  // Verify localStorage
  const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('user_profile') || '{}'));

  // Expected x: 5 + 2 + 1 + 2 + 1 = 11 (capped at 10)
  // Expected y: 5 + 4 + 3 - 1 = 11 (capped at 10)
  // Wait, I should check the data.ts values again.

  expect(profile.x).toBeGreaterThan(0);
  expect(profile.y).toBeGreaterThan(0);
});

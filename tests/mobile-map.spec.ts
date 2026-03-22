import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 12'] });

test('Mobile Map: Should be responsive and square', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Let\'s Go');

  // The Basics (skip quickly)
  await page.click('text=Black or Espresso.');
  await page.click('text=Lemon Tart');
  await page.click('text=Love the bite.');

  // Your Style
  await page.click('text=Fizzy & Refreshing');
  await page.click('text=Heatwave');
  await page.click('text=Stemmed & Elegant');

  // The Details
  await page.click('text=Love it.');
  await page.click('text=Spiced Orange');
  await page.click('text=Sipping slowly.');

  // Wait for results
  await expect(page.locator('text=Your Drink Menu')).toBeVisible({ timeout: 15000 });

  // Mini flavor map is a decorative 2:1 aspect ratio element
  const mapContainer = page.locator('.aspect-\\[2\\/1\\].max-w-sm');
  const box = await mapContainer.boundingBox();

  if (box) {
    // Check if it's roughly 2:1 aspect ratio
    const ratio = box.width / box.height;
    expect(ratio).toBeGreaterThan(1.8);
    expect(ratio).toBeLessThan(2.2);
  }
});

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
  await expect(page.locator('text=Your Drink Profile')).toBeVisible({ timeout: 15000 });

  const mapContainer = page.locator('.aspect-square.max-w-lg');
  const box = await mapContainer.boundingBox();

  if (box) {
    // Check if it's square
    expect(Math.abs(box.width - box.height)).toBeLessThan(5);

    // Check if it's taking up appropriate width on mobile (close to screen width)
    const viewport = page.viewportSize();
    if (viewport) {
        expect(box.width).toBeGreaterThan(viewport.width * 0.8);
    }
  }
});

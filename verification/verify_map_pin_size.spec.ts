import { test, expect } from '@playwright/test';

test('Verify MapPin click target size', async ({ page }) => {
  // Inject a user profile to skip the quiz and go straight to results
  // We navigate to / first, then local storage injection triggers the state update on mount
  await page.goto('http://localhost:9002/');

  await page.evaluate(() => {
    localStorage.setItem('user_profile', JSON.stringify({
      x: 0,
      y: 0,
      dislikesSmoke: false,
      dislikesBitter: false,
      dislikesAnise: false,
      vibeTags: {}
    }));
  });

  // Reload to trigger the useEffect that checks localStorage
  await page.reload();

  // Wait for the map to load
  await expect(page.locator('h1')).toContainText('The Palate Map');

  // Find a map pin (button inside the tooltip trigger)
  // We look for a button with aria-label starting with "Select"
  const pin = page.getByRole('button', { name: /Select/ }).first();

  await expect(pin).toBeVisible();

  // Get the bounding box of the button
  const box = await pin.boundingBox();
  if (!box) throw new Error('Pin bounding box not found');

  console.log(`Pin size: ${box.width}x${box.height}`);

  // Assert that the click target is at least 32x32 (approx w-8 h-8)
  expect(box.width).toBeGreaterThanOrEqual(30);
  expect(box.height).toBeGreaterThanOrEqual(30);

  // Take a screenshot of the map with pins
  await page.locator('.aspect-square').screenshot({ path: 'verification/map_pins.png' });

  // Hover over the pin to check visual dot size (we can't easily measure the dot via bounding box of parent,
  // but we can verify the parent size which is the key metric).
  // We can also screenshot the hover state.
  await pin.hover();
  await page.waitForTimeout(500); // Wait for transition
  await page.locator('.aspect-square').screenshot({ path: 'verification/map_pins_hover.png' });
});

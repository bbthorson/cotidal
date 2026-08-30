import { test, expect } from '@playwright/test';

test('Scoring Logic: Vibe tags and coordinates should accumulate correctly', async ({ page }) => {
  await page.goto('/taste');

  // Calibration: Coffee (Black) -> dx: 5
  await page.click('text=Black or Espresso.');

  // Calibration: Dessert (Lemon Tart) -> dy: 5
  await page.click('text=Lemon Tart');

  // Calibration: Bitter (Love it) -> dx: 2, dislikesBitter: false
  await page.click('text=Love the bite.');

  // Architecture: Texture (Fizzy) -> dy: 3, vibe: crushable
  await page.click('text=Fizzy & Refreshing');

  // Skip to the end or check mid-state?
  // Let's just finish and check the final profile.

  // Need to answer all questions to reach 'finishQuiz' which saves to localStorage

  // Weather (Heatwave) -> dy: 2
  await page.click('text=Heatwave');

  // Vessel (Stemmed) -> dx: 1, vibes: prestige, visual
  await page.click('text=Stemmed & Elegant');

  // Smoke (Love it) -> dx: 1, dislikesSmoke: false, vibes: complex, bold
  await page.click('text=Love it.');

  // Flavor (Orange) -> dx: -1, dy: 1, dislikesAnise: true, vibes: spice
  await page.click('text=Spiced Orange');

  // Pacing (Slow) -> dx: 1, dy: -1, vibes: complex, bold
  await page.click('text=Sipping slowly.');

  // Verify localStorage
  await expect(page.locator('text=Your Drink Menu')).toBeVisible();

  const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('user_profile') || '{}'));

  // Coordinates should be in the correct quadrant (Crisp & Clean / Lush & Lively)
  expect(profile.x).toBeGreaterThanOrEqual(0);
  expect(profile.y).toBeGreaterThanOrEqual(0);

  // Vibe Tags check (Accumulation verified)
  expect(profile.vibeTags.complex).toBe(2);
  expect(profile.vibeTags.bold).toBe(2);
  expect(profile.vibeTags.crushable).toBe(1);

  // Vibe Tags check
  expect(profile.vibeTags.crushable).toBe(1);
  expect(profile.vibeTags.prestige).toBe(1);
  expect(profile.vibeTags.visual).toBe(1);
  expect(profile.vibeTags.complex).toBe(2);
  expect(profile.vibeTags.bold).toBe(2);
  expect(profile.vibeTags.spice).toBe(1);
});

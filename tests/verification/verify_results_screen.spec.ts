import { test, expect } from '@playwright/test';

test('Verify ResultsScreen loads and displays content', async ({ page }) => {
  // Inject user profile
  const userProfile = {
    x: 5,
    y: 5,
    dislikesSmoke: false,
    dislikesBitter: false,
    dislikesAnise: false,
    vibeTags: { social: 2, visual: 1 }
  };

  await page.goto('/');

  await page.evaluate((profile) => {
    localStorage.setItem('user_profile', JSON.stringify(profile));
  }, userProfile);

  await page.reload();

  // Verify we are on Results Screen
  await expect(page.getByText('The Palate Revelation')).toBeVisible();

  // Verify Context Switcher
  await expect(page.getByLabel('Filter recommendations by context')).toBeVisible();

  // Verify Map
  await expect(page.getByLabel('Your Palate Profile: Lush & Lively')).toBeVisible();

  // Verify Top Matches
  await expect(page.getByText('Your Top Matches')).toBeVisible();

  // Verify at least one drink card
  // Wait for drinks to load/render
  await expect(page.getByRole('listitem').first()).toBeVisible();
});

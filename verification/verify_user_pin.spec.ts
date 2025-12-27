
import { test, expect } from '@playwright/test';

test('Verify UserPin rendering and interaction', async ({ page }) => {
  // Inject user profile to skip quiz and go to ResultsScreen
  await page.goto('http://localhost:9002/');

  await page.evaluate(() => {
    localStorage.setItem('user_profile', JSON.stringify({
      x: 5,
      y: 5,
      dislikesSmoke: false,
      dislikesBitter: false,
      dislikesAnise: false,
      vibeTags: {}
    }));
  });

  await page.reload();

  // Wait for ResultsScreen to load
  await expect(page.locator('h1').filter({ hasText: 'The Palate Map' })).toBeVisible();

  // Locate the UserPin
  const userPin = page.getByLabel('Your Palate Profile: Crisp & Clean');
  await expect(userPin).toBeVisible();

  // Hover over the UserPin to see tooltip
  await userPin.hover();

  // Use first() to avoid strict mode violation if tooltip renders content in multiple places (shadow DOM/portals)
  // or use a more specific selector targeting the tooltip content
  const tooltipContent = page.getByRole('tooltip').getByText('You are here');
  await expect(tooltipContent).toBeVisible();
  await expect(page.getByRole('tooltip').getByText('Crisp & Clean')).toBeVisible();

  // Take a screenshot
  await page.screenshot({ path: 'verification/user_pin_verified.png' });
});

import { test, expect } from '@playwright/test';

test('Visual Identity: Application should use Botanical & Mystic palette', async ({ page }) => {
  await page.goto('/');

  // Expect the body background to be Obsidian (hsl(0 0% 4%) -> rgb(10, 10, 10))
  const body = page.locator('body');
  await expect(body).toHaveCSS('background-color', 'rgb(10, 10, 10)');
});

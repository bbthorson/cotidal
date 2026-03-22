import { test, expect } from '@playwright/test';

test('Visual Identity: Application should use warm bar palette', async ({ page }) => {
  await page.goto('/');

  // Expect the body background to be deep charcoal (hsl(220 15% 8%) -> rgb(17, 19, 23))
  const body = page.locator('body');
  await expect(body).toHaveCSS('background-color', 'rgb(17, 19, 23)');
});

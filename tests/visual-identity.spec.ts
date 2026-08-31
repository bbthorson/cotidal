import { test, expect } from '@playwright/test';

/**
 * The ground is the load-bearing brand decision, so it is asserted rather than
 * trusted. It was obsidian (`220 15% 8%`) until the palette was inverted onto
 * paper; see docs/brand.md for why.
 */

test('Visual Identity: the ground is warm paper, not obsidian', async ({ page }) => {
  await page.goto('/');

  const body = page.locator('body');
  // --background: 47 39% 93%
  await expect(body).toHaveCSS('background-color', 'rgb(244, 241, 230)');
  // --foreground: 148 20% 17% — forest ink, not black
  await expect(body).toHaveCSS('color', 'rgb(35, 52, 43)');
});

test('Visual Identity: the headline accent is a different ink from the body', async ({ page }) => {
  await page.goto('/');

  /**
   * Asserted as a difference rather than an exact triple: `--primary`
   * (`8 55% 40%`) lands on a rounding boundary in HSL→RGB, and the claim worth
   * testing is that the accent resolves to its own colour at all — a token
   * that silently fails to apply is the failure mode this suite exists for.
   */
  const body = page.locator('body');
  const accent = page.getByRole('heading', { level: 1 }).locator('em');

  const [bodyColor, accentColor] = await Promise.all([
    body.evaluate((el) => getComputedStyle(el).color),
    accent.evaluate((el) => getComputedStyle(el).color),
  ]);

  expect(accentColor).not.toBe(bodyColor);
  expect(accentColor).toMatch(/^rgb\(1[45]\d, \d{2}, \d{2}\)$/);
});

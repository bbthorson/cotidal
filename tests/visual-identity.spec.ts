import { test, expect } from '@playwright/test';

/**
 * The ground is the load-bearing brand decision, so it is asserted rather than
 * trusted. It was obsidian (`220 15% 8%`) until the palette was inverted onto
 * paper; see docs/brand.md for why.
 */

test('Visual Identity: the ground and map drawer are warm paper, not obsidian', async ({ page }) => {
  await page.goto('/');

  const body = page.locator('body');
  // --background: 47 39% 93%
  await expect(body).toHaveCSS('background-color', 'rgb(244, 241, 230)');
  // --foreground: 148 20% 17% — forest ink, not black
  await expect(body).toHaveCSS('color', 'rgb(35, 52, 43)');
  // The drawer matches the tan ground of the app bar.
  await expect(page.locator('.map-card')).toHaveCSS('background-color', 'rgb(244, 241, 230)');
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

/**
 * What a link unfurls into (src/lib/share.ts). A server-rendered page names
 * its card by absolute URL, as scrapers want; a region page names its own
 * region's card; and the card is a real PNG at that address.
 */
test('Share: the landing page unfurls into the site card', async ({ page, request }) => {
  await page.goto('/');
  const image = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(image).toMatch(/^https?:\/\/[^/]+\/share\/site\.png$/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute('content', /.+/);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/apple-touch-icon.png');

  const res = await request.get(new URL(image!).pathname);
  expect(res.ok()).toBe(true);
  expect(res.headers()['content-type']).toBe('image/png');
});

test('Share: a region page unfurls into its region', async ({ page }) => {
  await page.goto('/drinks/regions/deep');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/share\/deep\.png$/);
});

test('Share: a map that cannot be read falls back to the site card', async ({ page }) => {
  await page.goto('/p/nobody.invalid');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/share\/site\.png$/);
});

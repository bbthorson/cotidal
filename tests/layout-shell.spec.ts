import { test, expect } from '@playwright/test';

/**
 * One kind of page (docs/design-system.md): every page a person visits is the
 * map and its card (`MapScreen`), the app bar the card's top. Before, the
 * header took each page's content width and sat somewhere different on nearly
 * every route, and footers were pasted per page and missing from three; then
 * there were two templates with the bar in two places. These hold it to one.
 */
const routes = ['/', '/drinks', '/drinks/20th-century', '/drinks/regions/deep', '/bars', '/mcp', '/sign-in', '/map', '/questions'];

test('Layout: every page is the map and its card, with the app bar in the same place', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  let reference: { x: number; y: number; width: number } | null = null;
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('.map-plane').first(), route).toBeVisible();
    const box = await page.locator('header').first().boundingBox();
    expect(box, `no app bar on ${route}`).not.toBeNull();
    const { x, y, width } = box!;
    reference ??= { x, y, width };
    expect({ x, y, width }, `the app bar moved on ${route}`).toEqual(reference);
  }
  // The address nobody visits on purpose is the same page.
  expect((await page.goto('/nowhere'))?.status()).toBe(404);
  await expect(page.locator('.map-plane').first()).toBeVisible();
});

test('Layout: one main landmark on every route, and one site footer on every route but the app screens', async ({ page }) => {
  // The map and the questions fill the window and have no footer: the app bar carries the reading pages.
  const appScreens = ['/map', '/questions'];
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('main'), route).toHaveCount(1);
    await expect(page.locator('footer'), route).toHaveCount(appScreens.includes(route) ? 0 : 1);
    await expect(page.getByRole('navigation', { name: 'Main navigation' }), route).toBeVisible();
  }
});

import { test, expect } from '@playwright/test';

/**
 * Every route renders through AppShell, which owns the header and footer. The
 * header used to take the page's content width, so it sat at a different
 * position and height on nearly every route; footers were pasted per page and
 * missing from three. This asserts the shell stays the one owner.
 */
const routes = ['/', '/drinks', '/drinks/20th-century', '/drinks/regions/deep', '/bars', '/how-it-works', '/map', '/questions'];

test('Layout: header sits in the same place on every route', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  let reference: { x: number; width: number } | null = null;

  for (const route of routes) {
    await page.goto(route);
    const box = await page.locator('header').first().boundingBox();
    expect(box, `no header on ${route}`).not.toBeNull();
    const { x, width } = box!;
    reference ??= { x, width };
    expect({ x, width }, `header moved on ${route}`).toEqual(reference);
  }
});

test('Layout: one main landmark on every route, and one site footer on every route but the map', async ({ page }) => {
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('main'), route).toHaveCount(1);
    // The map fills the window and has no footer: its header carries the reading pages.
    await expect(page.locator('footer'), route).toHaveCount(route === '/map' ? 0 : 1);
    await expect(page.getByRole('navigation', { name: 'Main navigation' }), route).toBeVisible();
  }
});

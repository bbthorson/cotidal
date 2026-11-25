import { test, expect } from '@playwright/test';

/**
 * Every route renders through AppShell, which owns the header and footer. The
 * header used to take the page's content width, so it sat at a different
 * position and height on nearly every route; footers were pasted per page and
 * missing from three. This asserts the shell stays the one owner.
 */
const routes = ['/', '/drinks', '/drinks/20th-century', '/drinks/regions/deep', '/bars', '/how-it-works', '/map', '/questions'];

test('Layout: the bar sits in one place per template, the top of the page or the top of the map\'s card', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  // A reading page's header runs across the top; a map page's app bar is the top of its card (AppBar.astro).
  const templates = {
    reading: ['/bars', '/mcp'],
    map: ['/', '/drinks', '/drinks/20th-century', '/drinks/regions/deep', '/how-it-works', '/map', '/questions'],
  };
  for (const [template, list] of Object.entries(templates)) {
    let reference: { x: number; y: number; width: number } | null = null;
    for (const route of list) {
      await page.goto(route);
      const box = await page.locator('header').first().boundingBox();
      expect(box, `no header on ${route}`).not.toBeNull();
      const { x, y, width } = box!;
      reference ??= { x, y, width };
      expect({ x, y, width }, `${template} bar moved on ${route}`).toEqual(reference);
    }
  }
});

test('Layout: one main landmark on every route, and one site footer on every route but the app screens', async ({ page }) => {
  // The map and the questions fill the window and have no footer: the header carries the reading pages.
  const appScreens = ['/map', '/questions'];
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('main'), route).toHaveCount(1);
    await expect(page.locator('footer'), route).toHaveCount(appScreens.includes(route) ? 0 : 1);
    await expect(page.getByRole('navigation', { name: 'Main navigation' }), route).toBeVisible();
  }
});

test('Layout: every page that is a place on the map draws it, and a reading page does not', async ({ page }) => {
  // Two templates (docs/design-system.md, Two kinds of page): the map and its card, or a reading column.
  const mapPages = ['/', '/drinks', '/drinks/negroni', '/drinks/regions/deep', '/how-it-works', '/sign-in', '/map', '/questions'];
  for (const route of mapPages) {
    await page.goto(route);
    await expect(page.locator('.map-plane'), route).toHaveCount(1);
  }
  for (const route of ['/bars', '/mcp']) {
    await page.goto(route);
    await expect(page.locator('.map-plane'), route).toHaveCount(0);
  }
});

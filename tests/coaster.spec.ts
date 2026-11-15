import { test, expect } from '@playwright/test';
import { regionCodeUrl, regionCoasterPath } from '../src/lib/coaster';
import { QUADRANT_ORDER, regionPath } from '../src/lib/quadrant';

/**
 * Coasters (docs/coasters.md). A member's code is their map by DID with
 * nothing appended; a member's coaster exists only for that member; a
 * region's coaster is public. Neither page ships script.
 */

test('Coaster: a member’s coaster does not exist for anyone else', async ({ request }) => {
  const res = await request.get('/p/nobody.invalid/code', { maxRedirects: 0 });
  expect(res.status()).toBe(404);
  expect(res.headers()['cache-control']).toContain('no-store');
});

test('Coaster: every region has one, encoding the region’s page, with no script', async ({ page, baseURL }) => {
  const scripts: string[] = [];
  page.on('response', (res) => {
    if (res.request().resourceType() === 'script' && res.url().includes('/_astro/')) scripts.push(res.url());
  });
  for (const id of QUADRANT_ORDER) {
    const res = await page.goto(regionCoasterPath(id));
    expect(res?.status(), id).toBe(200);
    const coaster = page.getByTestId('coaster');
    await expect(coaster).toBeVisible();
    expect(await coaster.getAttribute('data-code')).toBe(regionCodeUrl(new URL(baseURL!).origin, id));
    await page.goto(regionPath(id));
    await expect(page.getByTestId('region-coaster-link')).toHaveAttribute('href', regionCoasterPath(id));
  }
  expect(scripts).toEqual([]);
  expect((await page.request.get('/drinks/regions/nowhere/coaster')).status()).toBe(404);
});

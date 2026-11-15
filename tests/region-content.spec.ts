import { test, expect } from '@playwright/test';
import { QUADRANT_ORDER, regionPath } from '../src/lib/quadrant';

/** Region pages in the browser; their prose is checked in tests/unit/region-content.test.ts. */

test('Region pages: ship no client JavaScript', async ({ page }) => {
  for (const id of QUADRANT_ORDER) {
    const scripts: string[] = [];
    const listener = (res: { url(): string; request(): { resourceType(): string } }) => {
      if (res.request().resourceType() === 'script' && res.url().includes('/_astro/')) {
        scripts.push(res.url());
      }
    };
    page.on('response', listener);
    await page.goto(regionPath(id), { waitUntil: 'networkidle' });
    page.off('response', listener);

    expect(scripts, `${regionPath(id)} loads ${scripts.join(', ')}`).toHaveLength(0);
    expect(await page.locator('astro-island').count(), `${regionPath(id)} hydrates`).toBe(0);
  }
});

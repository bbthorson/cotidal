import { test, expect } from '@playwright/test';
import { publicMap } from '../src/lib/copy';

/**
 * `/p/<handle>`: someone's coordinate at a public URL.
 *
 * The lookups (handle → DID → document → record) are tested against a fake
 * `fetch`, so the suite needs no network. The route itself is tested only on
 * the paths that resolve offline: a reserved TLD never reaches the network.
 */

test('Public map route: an unknown actor is a 404 page, not an error', async ({ request }) => {
  const res = await request.get('/p/nobody.invalid');
  expect(res.status()).toBe(404);
  const html = await res.text();
  expect(html).toContain(publicMap.notFoundTitle);
  expect(html).toContain('href="/questions"');
  expect(html).toContain('aria-label="Main navigation"');
});

test('Public map route: ships no client JavaScript', async ({ page }) => {
  const scripts: string[] = [];
  page.on('response', (res) => {
    if (res.request().resourceType() !== 'script') return;
    const url = res.url();
    if (/\/@vite\/|\/@id\/|\/dev-toolbar\/|\/node_modules\//.test(url) || url.endsWith('.css')) return;
    scripts.push(url);
  });
  await page.goto('/p/nobody.invalid', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(publicMap.notFoundTitle);
  expect(scripts, `unexpected scripts: ${scripts.join(', ')}`).toHaveLength(0);
  expect(await page.locator('astro-island').count()).toBe(0);
});

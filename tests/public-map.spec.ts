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

test('Compare form: a handle typed on your map opens theirs, with no script', async ({ request }) => {
  const res = await request.get('/p?handle=%40friend.bsky.social', { maxRedirects: 0 });
  expect(res.status()).toBe(303);
  expect(res.headers()['location']).toBe('/p/friend.bsky.social');
  // Nothing typed goes back to where the map is reached from, not to an error.
  const empty = await request.get('/p?handle=', { maxRedirects: 0 });
  expect(empty.status()).toBe(303);
  expect(empty.headers()['location']).toBe('/settings#map');
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

test('The map\'s address: ?palate= is someone\'s public map, at /map, with no script', async ({ page, request }) => {
  // The same page /p/<handle> is, rendered at the map's address (map-url.ts).
  const res = await request.get('/map?palate=nobody.invalid&drink=negroni');
  expect(res.status()).toBe(404);
  expect(await res.text()).toContain(publicMap.notFoundTitle);

  const scripts: string[] = [];
  page.on('response', (r) => {
    if (r.request().resourceType() === 'script' && r.url().includes('/_astro/')) scripts.push(r.url());
  });
  await page.goto('/map?palate=@Nobody.invalid', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(publicMap.notFoundTitle);
  expect(page.url()).toContain('/map?palate=');
  expect(scripts).toHaveLength(0);

  // A palate that is not a handle or a DID is dropped: the map is yours, as without it.
  const plain = await request.get('/map?palate=not%20a%20handle');
  expect(plain.status()).toBe(200);
  expect(await plain.text()).toContain('id="app-search"');
});

test('One address for a page: the parameters only change what the map draws, so the canonical link drops them', async ({ request }) => {
  const html = await (await request.get('/map?drink=negroni&palate=not%20a%20handle')).text();
  expect(html).toMatch(/<link rel="canonical" href="[^"]*\/map"/);
  const drink = await (await request.get('/drinks/negroni/')).text();
  expect(drink).toMatch(/<link rel="canonical" href="\/drinks\/negroni\/?"/);
});

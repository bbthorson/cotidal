import { test, expect } from '@playwright/test';
import { QUADRANT_ORDER } from '../src/lib/quadrant';

/**
 * The landing page is the app's front door and must stay free of client
 * JavaScript: it previously mounted the whole React app with `client:only`,
 * so nothing painted until ~860 KB of JS had downloaded and hydrated.
 */

/**
 * `astro dev` injects its own tooling (the Vite HMR client, prebundled deps,
 * the dev toolbar) that never reaches production, and serves CSS as a module.
 * Anything the app itself ships is bundled under /_astro/, so filtering these
 * leaves exactly the scripts we care about in both dev and preview.
 */
const isDevServerScript = (url: string) =>
  url.includes('/@vite/') ||
  url.includes('/@id/') ||
  url.includes('/dev-toolbar/') ||
  url.includes('/node_modules/') ||
  url.endsWith('.css');

test('Landing: ships no client JavaScript', async ({ page }) => {
  const scripts: string[] = [];
  page.on('response', (res) => {
    if (res.request().resourceType() !== 'script') return;
    if (isDevServerScript(res.url())) return;
    scripts.push(res.url());
  });

  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  expect(scripts, `unexpected scripts: ${scripts.join(', ')}`).toHaveLength(0);
  // No hydration directive anywhere on the page.
  expect(await page.locator('astro-island').count()).toBe(0);
});

test('Landing: hero and quadrants are server-rendered', async ({ page }) => {
  // Reading the raw HTML (not the DOM) proves the content arrives from the
  // server rather than being produced by hydration.
  const response = await page.request.get('/');
  const html = await response.text();

  expect(html).toContain('Every palate has');
  for (const quadrant of ['The Ember', 'The Salt Line', 'The Vault', 'The Orchard']) {
    expect(html).toContain(quadrant);
  }
  expect(html).not.toMatch(/triangulat/i);
});

/**
 * The landing page names the four regions and the register groups its entries
 * under the same four. Those are two hand-written lists of the same ids, which
 * is the drift this codebase keeps producing — so the link between them is
 * asserted rather than assumed.
 */
test('Landing: each region links to its section of the register', async ({ page }) => {
  const landing = await (await page.request.get('/')).text();
  const register = await (await page.request.get('/drinks')).text();

  for (const id of QUADRANT_ORDER) {
    expect(landing, `no landing link to the ${id} region`).toContain(`/drinks#${id}`);
    expect(register, `no ${id} section for the landing link to reach`).toContain(`id="${id}"`);
  }
});

test('Landing: each region links to its dedicated region page', async ({ page }) => {
  const landing = await (await page.request.get('/')).text();

  for (const id of QUADRANT_ORDER) {
    expect(landing, `no landing link to /regions/${id}`).toContain(`/regions/${id}`);
    const regionPage = await (await page.request.get(`/regions/${id}`)).text();
    expect(regionPage).toContain('Sensory Stance');
    expect(regionPage).toContain('Technical Anatomy');
  }
});

test('Landing: sign-in works without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');

  // A real <form> post, not a fetch() handler, so the flow degrades cleanly.
  const form = page.locator('form[action="/api/auth/atproto/login"]');
  const disabled = page.getByText('Sign-in is not enabled in this environment.');
  await expect(form.or(disabled).first()).toBeVisible();

  await expect(page.getByRole('link', { name: /find your coordinate/i })).toHaveAttribute(
    'href',
    '/taste'
  );
  await context.close();
});

test('Landing: surfaces sign-in errors from the callback', async ({ page }) => {
  await page.goto('/?error=atproto_callback_failed');
  await expect(page.getByRole('alert')).toContainText('Sign-in did not complete');
});

test('Navigation: unified header navigation renders on landing and register', async ({ page }) => {
  const landing = await (await page.request.get('/')).text();
  expect(landing).toContain('aria-label="Main Navigation"');
  expect(landing).toContain('href="/taste"');
  expect(landing).toContain('href="/drinks"');
  expect(landing).toContain('href="/#regions"');
  expect(landing).toContain('href="/#connect"');

  const register = await (await page.request.get('/drinks')).text();
  expect(register).toContain('aria-label="Main Navigation"');
  expect(register).toContain('href="/taste"');
  expect(register).toContain('href="/drinks"');

  const taste = await (await page.request.get('/taste')).text();
  expect(taste).toContain('aria-label="Main Navigation"');
  expect(taste).toContain('href="/taste"');
  expect(taste).toContain('href="/drinks"');
});


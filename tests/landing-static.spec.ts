import { test, expect } from '@playwright/test';
import { QUADRANT_ORDER } from '../src/lib/quadrant';
import { quadrants, formerQuadrantIds, nav as nav_ } from '../src/lib/copy';
import { AUTH_ERROR_MESSAGES } from '@bbthorson/atproto-cf-auth/client';

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
  for (const { name } of quadrants) {
    expect(html).toContain(name);
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
    const name = quadrants.find((q) => q.id === id)!.name;
    expect(regionPage, `/regions/${id} does not name its region`).toContain(name);
    expect(regionPage, `/regions/${id} does not link its drinks`).toContain(`/drinks#${id}`);
  }
});

test('Regions: the pages from before the water names redirect to their successors', async ({ request }) => {
  for (const [from, to] of Object.entries(formerQuadrantIds)) {
    const res = await request.get(`/regions/${from}`, { maxRedirects: 0 });
    expect(res.status(), from).toBe(301);
    expect(new URL(res.headers()['location'], 'http://x').pathname).toBe(`/regions/${to}`);
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
    '/questions'
  );
  await context.close();
});

test('Landing: surfaces sign-in errors from the callback', async ({ page }) => {
  await page.goto('/?auth_error=callback_failed');
  await expect(page.getByRole('alert')).toContainText(AUTH_ERROR_MESSAGES.callback_failed);
});

test('Navigation: unified header navigation renders on landing and register', async ({ page }) => {
  const landing = await (await page.request.get('/')).text();
  expect(landing).toContain('aria-label="Main Navigation"');
  expect(landing).toContain('href="/compass"');
  expect(landing).toContain('href="/drinks"');
  expect(landing).toContain('href="/#regions"');
  expect(landing).toContain('href="/#connect"');

  const register = await (await page.request.get('/drinks')).text();
  expect(register).toContain('aria-label="Main Navigation"');
  expect(register).toContain('href="/compass"');
  expect(register).toContain('href="/drinks"');

  const compass = await (await page.request.get('/compass')).text();
  expect(compass).toContain('aria-label="Main Navigation"');
  expect(compass).toContain('href="/compass"');
  expect(compass).toContain('href="/drinks"');
});


test('Header: on a phone the destinations fold under "Menu", without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('/');

  const nav = page.getByRole('navigation', { name: 'Main Navigation' });
  await expect(nav).toBeHidden();
  await page.locator('header summary').click();
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('link', { name: nav_.register, exact: true })).toBeVisible();
  await context.close();
});

test('Landing: one primary action, with its cost stated', async ({ page }) => {
  const html = await (await page.request.get('/')).text();
  expect(html).toContain('About two minutes · no account needed');
  expect(html).toContain('href="#regions"');
});

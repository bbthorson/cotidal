import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { QUADRANT_ORDER, quadrantIdFor, regionPath } from '../src/lib/quadrant';
import { drinkDatabase } from '../src/lib/data';
import { quadrants, drinks, nav as nav_ } from '../src/lib/copy';
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
 * The landing page names the four regions; a region is the drinks filtered to
 * it. Asserted rather than assumed, because the ids are written into links in
 * more than one place.
 */
test('Landing: each region opens the drinks filtered to it', async ({ page }) => {
  const landing = await (await page.request.get('/')).text();
  const register = await (await page.request.get('/drinks')).text();

  for (const id of QUADRANT_ORDER) {
    const path = regionPath(id);
    expect(landing, `no landing link to ${path}`).toContain(`href="${path}"`);
    expect(register, `/drinks does not offer the ${id} filter`).toContain(`href="${path}"`);

    const filtered = await (await page.request.get(path)).text();
    const name = quadrants.find((q) => q.id === id)!.name;
    expect(filtered, `${path} does not name its region`).toContain(name);
  }
});

test('Drinks: a region filter lists only that region’s drinks, and is read as Drinks', async ({ page }) => {
  const [first] = QUADRANT_ORDER;
  await page.goto(regionPath(first));
  const filter = page.getByRole('navigation', { name: drinks.filterLabel });
  await expect(filter.locator('a[aria-current="page"]')).toHaveAttribute('href', regionPath(first));
  await expect(filter.getByRole('link', { name: drinks.filterAll })).toHaveAttribute('href', '/drinks');

  // Every drink listed is one the map places in this region.
  const listed = await page.locator('main a[href^="/drinks/"]:not([href^="/drinks/regions"])').evaluateAll(
    (links) => links.map((a) => a.getAttribute('href')!.slice('/drinks/'.length))
  );
  expect(listed.length).toBeGreaterThan(0);
  for (const slug of listed) {
    const entry = readFileSync(`src/content/drinks/${slug}.md`, 'utf8');
    const name = /^name:\s*["']?(.+?)["']?\s*$/m.exec(entry)![1];
    const drink = drinkDatabase.find((d) => d.name === name)!;
    expect(quadrantIdFor(drink.x, drink.y), slug).toBe(first);
  }

  const current = page.locator('footer a[aria-current="page"]');
  await expect(current).toHaveAttribute('href', '/drinks');
});

test('Landing: sign-in works without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');

  // A real <form> post, not a fetch() handler, so the flow degrades cleanly.
  const form = page.locator('form[action="/api/auth/atproto/login"]');
  const disabled = page.getByText('Signing in is switched off for now. Everything else works.');
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

test('Navigation: unified header navigation renders on landing, drinks and compass', async ({ page }) => {
  const landing = await (await page.request.get('/')).text();
  expect(landing).toContain('aria-label="Main navigation"');
  expect(landing).toContain('href="/compass"');
  expect(landing).toContain('href="/#connect"');

  const register = await (await page.request.get('/drinks')).text();
  expect(register).toContain('aria-label="Main navigation"');
  expect(register).toContain('href="/compass"');

  const compass = await (await page.request.get('/compass')).text();
  expect(compass).toContain('aria-label="Main navigation"');
  expect(compass).toContain('href="/compass"');

  // Drinks is a reading page: the footer carries it, the header does not.
  for (const html of [landing, register, compass]) {
    const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
    expect(header).not.toContain('href="/drinks"');
  }
});


test('Header: on a phone the destinations fold under "Menu", without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('/');

  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav).toBeHidden();
  await page.locator('header summary').click();
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('link', { name: nav_.log, exact: true })).toBeVisible();
  await context.close();
});

test('Landing: one primary action, with its cost stated', async ({ page }) => {
  const html = await (await page.request.get('/')).text();
  expect(html).toContain('About two minutes · no account needed');
  expect(html).toContain('href="#regions"');
});

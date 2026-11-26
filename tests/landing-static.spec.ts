import { test, expect } from '@playwright/test';
import { QUADRANT_ORDER, quadrantIdFor, regionPath } from '../src/lib/quadrant';
import { drinkDatabase } from '../src/lib/data';
import { quadrants, drinks, explore, hero, nav as nav_, notFound, site } from '../src/lib/copy';
import { SAMPLE_FRAMES, SAMPLE_POURS } from '../src/lib/sample-palate';
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

test('Landing: the front door is server-rendered, and asks one thing', async ({ page }) => {
  // Reading the raw HTML (not the DOM) proves the content arrives from the
  // server rather than being produced by hydration.
  const response = await page.request.get('/');
  const html = await response.text();

  expect(html).toContain(hero.headline);
  expect(html).not.toMatch(/triangulat/i);
  // The front door is the map, drawn by the server: the regions are named on it as on every map.
  for (const { name } of quadrants) expect(html).toContain(name);

  await page.goto('/');
  await expect(page.locator('main a.btn')).toHaveCount(1);
  await expect(page.locator('main form')).toHaveCount(0);
});

/**
 * A region is a filter on the map (`/map?region=<id>`), not a page:
 * asserted rather than assumed, because the ids are written into links in
 * more than one place (the drink card, `/p`, the chat tools, the share cards).
 */
test('Regions: each is a filter on the map, drawn with the page: its name, every drink the map places there, and its write-up', async ({ page }) => {
  for (const id of QUADRANT_ORDER) {
    const path = regionPath(id);
    expect(path).toBe(`/map?region=${id}`);
    await page.goto(path);
    const name = quadrants.find((q) => q.id === id)!.name;
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    const placed = drinkDatabase.filter((d) => quadrantIdFor(d.x, d.y) === id).length;
    await expect(page.getByTestId('region-drinks').getByRole('listitem')).toHaveCount(placed);
    await expect(page.getByTestId('region-entry')).toBeAttached();
    // The filter moves between them in place, and All is the map.
    const filter = page.getByRole('navigation', { name: drinks.filterLabel });
    await expect(filter.locator('a[aria-current="page"]')).toHaveAttribute('href', path);
    await expect(filter.getByRole('link', { name: drinks.filterAll })).toHaveAttribute('href', '/map');
  }
});

test('Regions: a drink opened from a region comes back to it, and there is no list of drinks of its own', async ({ page }) => {
  expect((await page.request.get('/drinks')).status()).toBe(404);
  expect((await page.request.get('/drinks/regions/deep')).status()).toBe(404);
  await page.goto(regionPath('deep'));
  await page.getByTestId('region-drinks').getByRole('button').first().click();
  await expect(page.getByTestId('region-drinks')).toHaveCount(0);
  await page.getByRole('button', { name: /The Deep/ }).first().click();
  await expect(page.getByTestId('region-drinks')).toBeVisible();
});

test('Drinks: a drink entry has Recipe structured data and one way to compare it against your palate', async ({ page }) => {
  const html = await (await page.request.get('/drinks/absinthe-drip')).text();
  expect(html).toContain('"@type":"Recipe"');
  // One link for a member and a stranger alike: the questions go straight on to the drink on your map if you have a coordinate.
  expect(html).toContain('href="/map?drink=absinthe-drip&amp;quiz=1"');
  expect(html).toContain(drinks.compareCta);
});

test('Drinks: a drink is the map with the drink marked and its entry in the card, and ships no script', async ({ page }) => {
  const scripts: string[] = [];
  page.on('response', (res) => {
    if (res.request().resourceType() === 'script' && !isDevServerScript(res.url())) scripts.push(res.url());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/drinks/negroni', { waitUntil: 'networkidle' });
  expect(scripts).toHaveLength(0);
  expect(await page.locator('astro-island').count()).toBe(0);

  const map = page.getByRole('group', { name: explore.chartLabel });
  const card = page.getByRole('region', { name: 'Negroni' });
  await expect(map).toBeVisible();
  await expect(map.getByText('Negroni', { exact: true })).toBeVisible();
  await expect(card.getByRole('heading', { level: 1, name: 'Negroni' })).toBeVisible();
  await expect(card.getByRole('heading', { name: drinks.nearLabel })).toBeAttached();
  // The page's name is said once, in the app bar, with its way back; no line of its own under the bar.
  await expect(card.getByTestId('page-name')).toHaveText(/^Drinks · /);
  await expect(card.locator('header').getByRole('link', { name: drinks.backLabel })).toHaveAttribute('href', '/map?drink=negroni');
  await expect(card.getByText(/^Drinks · /)).toHaveCount(1);

  // On a phone the card rests under the map and scrolling the page pulls it up over it.
  const mapTop = (await map.boundingBox())!.y;
  const cardTop = (await card.boundingBox())!.y;
  expect(cardTop).toBeGreaterThan(mapTop + 200);
  await page.mouse.wheel(0, 400);
  await expect.poll(async () => (await card.boundingBox())!.y).toBeLessThan(cardTop - 300);
  // The map stays on screen, at the top, under the card.
  expect((await map.boundingBox())!.y).toBeGreaterThanOrEqual(-1);

  // From `lg` the card is a panel down the left, the map beside it.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0));
  const [c, m] = [(await card.boundingBox())!, (await map.boundingBox())!];
  expect(c.x + c.width).toBeLessThan(m.x);
});

test('Sign in: works without JavaScript, from its own page', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/sign-in');

  // A real <form> post, not a fetch() handler, so both sign-in and Create an account degrade cleanly.
  const form = page.locator('form[action="/api/auth/atproto/login"]');
  const disabled = page.getByText('Signing in is switched off for now. Everything else works.');
  await expect(form.or(disabled).first()).toBeVisible();
  if (await form.isVisible()) {
    await expect(form.locator('button[name="signUp"][value="1"][formnovalidate]')).toBeVisible();
  }

  await page.goto('/');
  await expect(page.getByRole('link', { name: /find your coordinate/i })).toHaveAttribute(
    'href',
    '/map?quiz=1'
  );
  await context.close();
});

test('Sign in: enhances with <bsky-sign-in> without mounting a React island', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'atproto-cf-auth:recent-accounts',
      JSON.stringify([
        {
          did: 'did:plc:alice123',
          handle: 'alice.bsky.social',
          displayName: 'Alice',
          lastUsedAt: '2026-11-24T00:00:00.000Z',
        },
      ])
    );
  });
  await page.goto('/sign-in', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // Progressively enhanced by the lightweight custom element, never a React island.
  expect(await page.locator('astro-island').count()).toBe(0);

  const el = page.locator('bsky-sign-in');
  if ((await el.count()) > 0) {
    await expect(el).toHaveAttribute('data-state', 'idle');
    await expect(el.getByRole('button', { name: /Continue as Alice/ })).toBeVisible();
    await el.getByRole('button', { name: /Forget @alice\.bsky\.social/ }).click();
    await expect(el.getByRole('button', { name: /Continue as Alice/ })).toHaveCount(0);
  }
});

test('Sign in: surfaces sign-in errors', async ({ page }) => {
  await page.goto('/sign-in?auth_error=callback_failed');
  await expect(page.getByRole('alert')).toContainText(AUTH_ERROR_MESSAGES.callback_failed);
});

test('Navigation: unified header navigation renders on landing, drinks and the map', async ({ page }) => {
  const landing = await (await page.request.get('/')).text();
  expect(landing).toContain('aria-label="Main navigation"');
  expect(landing).toContain('href="/map"');
  expect(landing).toContain('href="/sign-in"');
  // Drinks pages are for SEO/AEO and members, not linked from the homepage for unauthenticated visitors.
  expect(landing).not.toContain('href="/drinks"');

  const drinkPage = await (await page.request.get('/drinks/negroni')).text();
  expect(drinkPage).toContain('aria-label="Main navigation"');
  expect(drinkPage).toContain('href="/map"');

  const map = await (await page.request.get('/map')).text();
  expect(map).toContain('aria-label="Main navigation"');
  expect(map).toContain('href="/map"');

  await page.setViewportSize({ width: 1280, height: 900 });
  for (const path of ['/', '/drinks/negroni', '/map']) {
    await page.goto(path);
    await expect(page.locator('header a[href="/drinks"]'), path).toHaveCount(0);
  }
});


test('Header: on a phone the destinations fold under "Menu", without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('/');

  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav).toBeHidden();
  // One control on a phone: Sign in is inside the Menu, not beside it.
  await expect(page.locator('header').getByRole('link', { name: nav_.signIn, exact: true })).toBeHidden();
  await page.locator('header summary').click();
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('link', { name: nav_.map, exact: true })).toBeVisible();
  await expect(nav.getByRole('link', { name: nav_.signIn, exact: true })).toHaveAttribute('href', '/sign-in');
  await context.close();
});

test('Landing: the map, then the one action, on the first screen of any phone; the footer is the card\'s foot', async ({ page }) => {
  for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const map = (await page.getByRole('group', { name: explore.chartLabel }).boundingBox())!;
    const cta = (await page.getByRole('link', { name: hero.primaryCta }).boundingBox())!;
    const size = `${viewport.width}×${viewport.height}`;
    expect(map.width, size).toBeGreaterThan(250);
    expect(cta.y + cta.height, size).toBeLessThanOrEqual(viewport.height);
    // How it works and the footer are in the card, under its fold.
    const card = page.getByRole('region', { name: site.name });
    await expect(card.getByRole('heading', { name: hero.howTitle })).toBeAttached();
    await expect(card.locator('footer')).toHaveCount(1);
  }
});

test('Landing: the sample palate is the terrain code\'s, labelled as a sample, and still for less motion', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByText(hero.sampleLabel)).toBeVisible();
  const map = page.getByRole('group', { name: explore.chartLabel });
  // One frame per pour and one for the start, the last held: every sample pour is named with its rating.
  const frames = map.locator('div.tide-frame');
  await expect(frames).toHaveCount(SAMPLE_FRAMES);
  const last = map.locator('div.tide-frame[data-last]');
  for (const p of SAMPLE_POURS) await expect(last.getByText(explore.ratedMark(p.drink, p.rating))).toBeVisible();
  // Every other frame is out of sight.
  await expect(frames.first()).toHaveCSS('opacity', '0');
  await context.close();
});

test('Landing: one primary action, with its cost stated', async ({ page }) => {
  const html = await (await page.request.get('/')).text();
  expect(html).toContain(hero.cost);
});

test('Not found: an unknown address answers 404 with the site, not the framework', async ({ page }) => {
  const scripts: string[] = [];
  page.on('response', (res) => {
    if (res.request().resourceType() !== 'script') return;
    if (isDevServerScript(res.url())) return;
    scripts.push(res.url());
  });

  const res = await page.goto('/no-such-page', { waitUntil: 'networkidle' });
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: notFound.title })).toBeVisible();
  await expect(page.getByRole('link', { name: notFound.cta })).toBeVisible();
  // The paper ground, not a dark default page.
  const ground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(ground).toBe('rgb(244, 241, 230)');
  expect(scripts, `unexpected scripts: ${scripts.join(', ')}`).toHaveLength(0);
});

import { test, expect } from '@playwright/test';
import { compare, publicMap } from '../src/lib/copy';

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
  expect(html).toContain('href="/?quiz=1"');
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

test('The map\'s address: ?palate= is someone\'s public map, at /, with no script', async ({ page, request }) => {
  // The same page /p/<handle> is, rendered at the map's address (map-url.ts).
  const res = await request.get('/?palate=nobody.invalid&drink=negroni');
  expect(res.status()).toBe(404);
  expect(await res.text()).toContain(publicMap.notFoundTitle);

  const scripts: string[] = [];
  page.on('response', (r) => {
    if (r.request().resourceType() === 'script' && r.url().includes('/_astro/')) scripts.push(r.url());
  });
  await page.goto('/?palate=@Nobody.invalid', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(publicMap.notFoundTitle);
  expect(page.url()).toContain('/?palate=');
  expect(scripts).toHaveLength(0);

  // A palate that is not a handle or a DID is dropped: the map is yours, as without it.
  const plain = await request.get('/?palate=not%20a%20handle');
  expect(plain.status()).toBe(200);
  expect(await plain.text()).toContain('id="map-search"');
});

test('One address for a page: the parameters only change what the map draws, so the canonical link drops them', async ({ request }) => {
  const html = await (await request.get('/?drink=negroni&palate=not%20a%20handle')).text();
  expect(html).toMatch(/<link rel="canonical" href="[^"]*\/"/);
  const drink = await (await request.get('/drinks/negroni/')).text();
  expect(drink).toMatch(/<link rel="canonical" href="\/drinks\/negroni\/?"/);
});

/**
 * Made-up people (`sample-people.ts`): records the app carries for `.test`
 * handles, which never resolve on the network, so someone's map — their
 * taste, a drink on it, a comparison — renders here exactly as a real
 * person's would, through the same reader.
 */
test('A made-up person: their taste as ground, their menu with what put it there, and a note that they are made up', async ({ page }) => {
  await page.goto('/?palate=deep.test');
  await expect(page.getByTestId('sample-note')).toHaveText(publicMap.sampleNote);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await expect(page.getByTestId('leanings')).toContainText('rich and savory');
  const menu = page.getByTestId('their-menu');
  await expect(menu).toContainText('Manhattan');
  await expect(menu).toContainText(/near their/i);
  // What they rated low is off their menu; their ratings are on their map.
  await expect(menu).not.toContainText('Aperol Spritz');
  const map = page.getByRole('group', { name: publicMap.plotLabel(publicMap.title('deep.test')) });
  await expect(map.getByText('Manhattan · 9')).toBeVisible();
});

test('A made-up person: a drink on their map says what put it there and which way it lies, and two hills are two', async ({ page }) => {
  await page.goto('/?palate=deep.test&drink=negroni');
  const drink = page.getByTestId('palate-drink');
  await expect(drink).toContainText('Rated 8');
  await expect(drink.getByRole('link', { name: publicMap.drinkForYou })).toHaveAttribute('href', '/?drink=negroni');

  await page.goto('/p/both.test');
  await expect(page.getByTestId('leanings')).toContainText('rich and savory');
  await expect(page.getByTestId('leanings')).toContainText('crisp and sweet');
});

test('Two made-up people compared: where they part, each way, from their own ground', async ({ page }) => {
  await page.goto('/?palate=deep.test&with=surf.test');
  const overlap = page.getByTestId('overlap');
  await expect(overlap).toContainText(publicMap.onlyLabel('@deep.test', '@surf.test'));
  await expect(overlap).toContainText(publicMap.onlyLabel('@surf.test', '@deep.test'));
  await expect(overlap).toContainText('Manhattan');
  // The second taste is drawn over the first as lines of its own.
  expect(await page.locator('g[data-against] path').count()).toBeGreaterThan(0);
});

test('Two made-up people compared: the map draws the comparison\'s drinks, not the staples', async ({ page }) => {
  const drawn = (slug: string) => page.locator(`[data-drink="${slug}"]`);
  // One person alone: the staples, so a Mojito is on the map.
  await page.goto('/?palate=deep.test');
  await expect(drawn('mojito')).toHaveCount(1);
  // Compared: where the two part, each way (Manhattan, Daiquiri), and the picks for both, in place of the staples.
  await page.goto('/?palate=deep.test&with=surf.test');
  await expect(drawn('manhattan')).toHaveCount(1);
  await expect(drawn('daiquiri')).toHaveCount(1);
  await expect(drawn('mojito')).toHaveCount(0);
  await expect(drawn('gin-and-tonic')).toHaveCount(0);
  expect(await page.locator('[data-drink]').count()).toBeLessThan(20);
});

test('A drink and a person are compared the same way: from the nearest hill, which way, and what is behind it', async ({ page }) => {
  // A drink is a point on their map.
  await page.goto('/?palate=deep.test&drink=negroni');
  const drink = page.locator('[data-testid="comparison"][data-kind="drink"]');
  await expect(drink.getByRole('heading', { name: compare.title(compare.theirs('@deep.test')) })).toBeVisible();
  await expect(drink).toContainText(compare.fromLabel);
  await expect(drink).toContainText(compare.wayLabel);
  await expect(drink).toContainText(compare.drinkReach('@deep.test', true));

  // A person is a set of points: the same comparison, from the same hill, to the highest of theirs.
  await page.goto('/?palate=deep.test&with=surf.test');
  const person = page.locator('[data-testid="comparison"][data-kind="person"]');
  await expect(person.getByRole('heading', { name: compare.title(compare.theirs('@deep.test')) })).toBeVisible();
  await expect(person).toContainText(compare.fromLabel);
  await expect(person).toContainText(compare.wayLabel);
  await expect(person).toContainText(/crisper, sweeter/);
});

test('A made-up person with no palate is the page for no palate, and still says they are made up', async ({ request }) => {
  const res = await request.get('/p/quiet.test');
  expect(res.status()).toBe(404);
  const html = await res.text();
  expect(html).toContain(publicMap.noPalateTitle);
  expect(html).toContain('data-testid="sample-note"');
});

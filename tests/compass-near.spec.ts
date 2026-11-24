import { test, expect } from '@playwright/test';
import { chart, compass, moved, pour, ratePage, waitingPick } from '../src/lib/copy';
import { GEO_TYPE } from '../src/lib/atproto/location';

const profile = { x: 4, y: -2, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false, vibeTags: {} };
const here = { latitude: 40.722349, longitude: -73.988312 };
const overpass = {
  elements: [
    { type: 'node', id: 1, lat: 40.7224, lon: -73.9883, tags: { amenity: 'bar', name: 'Attaboy' } },
    { type: 'node', id: 2, lat: 40.7236, lon: -73.9872, tags: { amenity: 'pub', name: 'The Corner Pub' } },
  ],
};
// A 1×1 PNG, so tile requests answer without the network.
const tile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=', 'base64');

test('Compass: without location, the map waits to be asked, and nothing is sent', async ({ page }) => {
  let asked = false;
  await page.route('https://overpass-api.de/**', (r) => ((asked = true), r.abort()));
  await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.goto('/compass');
  await expect(page.getByRole('button', { name: compass.showNear })).toBeVisible();
  await expect(page.getByText(compass.nearNote)).toBeVisible();
  expect(asked).toBe(false);
});

test('Compass: a device that cannot find itself is not told location is off, and can try again', async ({ page }) => {
  await page.addInitScript((p) => {
    localStorage.setItem('user_profile', JSON.stringify(p));
    // A timeout (code 3), as a desktop without a fix gives.
    navigator.geolocation.getCurrentPosition = (_ok, fail) =>
      fail?.({ code: 3, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: 'Timeout' } as GeolocationPositionError);
  }, profile);
  await page.goto('/compass');
  await page.getByRole('button', { name: compass.showNear }).click();
  await expect(page.getByText(compass.unlocated)).toBeVisible();
  await expect(page.getByText(compass.denied)).toHaveCount(0);
  await expect(page.getByRole('button', { name: compass.retry })).toBeVisible();
});

test('Compass: Overpass giving up reads as no answer, not as no bars', async ({ browser }) => {
  const context = await browser.newContext({ permissions: ['geolocation'], geolocation: here });
  const page = await context.newPage();
  await page.route('https://overpass-api.de/**', (r) =>
    r.fulfill({ json: { elements: [], remark: 'runtime error: Query timed out in "query" at line 1 after 26 seconds.' } })
  );
  await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.goto('/compass');
  await expect(page.getByText(compass.failed)).toBeVisible();
  await expect(page.getByText(compass.noneNear)).toHaveCount(0);
  await context.close();
});

test('Compass: the chart sits beside your menu on a wide screen, above it on a phone', async ({ page }) => {
  await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  const yours = page.getByRole('heading', { name: compass.menuTitle });
  const map = page.getByRole('region', { name: chart.label });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/compass');
  await expect(page.getByRole('heading', { level: 1, name: compass.heading })).toBeVisible();
  await expect(yours).toBeVisible();
  const [m, t] = [(await map.boundingBox())!, (await yours.boundingBox())!];
  expect(m.x + m.width).toBeLessThan(t.x);
  expect(Math.abs(m.y - t.y)).toBeLessThan(m.height);

  await page.setViewportSize({ width: 390, height: 844 });
  const [m2, t2] = [(await map.boundingBox())!, (await yours.boundingBox())!];
  expect(m2.y + m2.height).toBeLessThan(t2.y);
});

test('Compass: bars near you, then a pick there, then a pour that says where the bar is', async ({ browser }) => {
  const context = await browser.newContext({ permissions: ['geolocation'], geolocation: here });
  const page = await context.newPage();
  let sent = '';
  await page.route('https://overpass-api.de/**', (r) => {
    sent = decodeURIComponent(r.request().postData() ?? '');
    return r.fulfill({ json: overpass });
  });
  await page.route('https://tile.openstreetmap.org/**', (r) => r.fulfill({ body: tile, contentType: 'image/png' }));
  await page.addInitScript((p) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('user_profile', JSON.stringify(p));
      sessionStorage.setItem('seeded', '1');
    }
  }, profile);

  // Location already allowed: the map opens on its own, and the point went out rounded.
  await page.goto('/compass');
  const near = page.getByRole('heading', { name: compass.nearTitle });
  await expect(near).toBeVisible();
  expect(sent).toContain('40.722,-73.988');
  expect(sent).not.toContain('40.722349');
  await expect(page.getByRole('region', { name: compass.mapLabel }).first()).toBeVisible();

  // A bar opens in the card, and "Pick a drink here" carries where it is.
  await page.getByRole('button', { name: /Attaboy/ }).click();
  await page.getByRole('button', { name: compass.pickHere }).click();

  // Compass shows that bar's menu, still on /compass.
  await expect(page).toHaveURL(/\/compass$/);
  await expect(page.getByRole('heading', { name: 'Attaboy' })).toBeVisible();
  await expect(page.getByLabel(compass.atMenu.barLabel)).toHaveCount(0);
  const add = page.getByLabel(compass.atMenu.addLabel);
  await add.fill('Negroni');
  await add.press('Enter');
  await page.getByRole('button', { name: chart.pickThis }).click();

  // The pick waits on Compass, and rating it opens the draft.
  await expect(page.getByText(waitingPick.waiting)).toBeVisible();
  await page.getByRole('button', { name: new RegExp(waitingPick.rate) }).click();

  // Rated at the bar the map named: the pour records where it is.
  await expect(page.getByRole('heading', { name: ratePage.heading })).toBeVisible();
  await page.getByRole('radio', { name: /^7:/ }).click();
  await page.getByRole('button', { name: pour.submit }).click();
  await expect(page.getByRole('heading', { name: /^Moved \d/ })).toBeVisible();

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('guest_pours') ?? '[]'));
  expect(saved[0].venue).toEqual({
    entity: { name: 'Attaboy' },
    address: { $type: GEO_TYPE, latitude: '40.722400', longitude: '-73.988300', name: 'Attaboy' },
  });
  await context.close();
});

test('Compass: a drink the map does not know can still be rated, and the pour says it moved nothing', async ({ page }) => {
  await page.addInitScript((p) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('user_profile', JSON.stringify(p));
      sessionStorage.setItem('seeded', '1');
    }
  }, profile);
  await page.goto('/compass');
  await page.getByRole('searchbox').fill('Retsina');
  await expect(page.getByText(compass.noDrinks)).toBeVisible();
  await page.getByRole('button', { name: compass.rateUnlisted('Retsina') }).click();

  await expect(page).toHaveURL(/\/compass$/);
  await expect(page.getByLabel(pour.drinkLabel)).toHaveValue('Retsina');
  await expect(page.getByText(pour.unlisted('Retsina'))).toBeVisible();
  await page.getByRole('button', { name: pour.atHome }).click();
  await page.getByRole('button', { name: pour.submit }).click();

  await expect(page.getByRole('heading', { name: moved.unlistedTitle })).toBeVisible();
  await expect(page.getByText(moved.unlisted('Retsina'), { exact: false })).toBeVisible();
  await expect(page.getByText(moved.offMenu)).toHaveCount(0);
});

test('Compass: a drink found by another name it goes by', async ({ page }) => {
  await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.goto('/compass');
  await page.getByRole('searchbox').fill('Prosecco DOC');
  await expect(page.locator('ol').getByRole('button', { name: /^Prosecco/ })).toBeVisible();
  await expect(page.getByText(compass.noDrinks)).toHaveCount(0);
});

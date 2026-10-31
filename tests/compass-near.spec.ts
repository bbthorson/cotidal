import { test, expect } from '@playwright/test';
import { compass, harbour, menu, pour, ratePage } from '../src/lib/copy';
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

test('Compass: the map sits beside the menu on a wide screen, above it on a phone', async ({ page }) => {
  await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  const top = page.getByText(`${menu.topPrefix} · ${menu.topTitle}`);
  const map = page.getByRole('region', { name: compass.mapLabel });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/compass');
  await expect(page.getByRole('heading', { level: 1, name: compass.heading })).toBeVisible();
  await expect(top).toBeVisible();
  const [m, t] = [(await map.boundingBox())!, (await top.boundingBox())!];
  expect(m.x + m.width).toBeLessThan(t.x);
  expect(Math.abs(m.y - t.y)).toBeLessThan(m.height);

  await page.setViewportSize({ width: 390, height: 844 });
  const [m2, t2] = [(await map.boundingBox())!, (await top.boundingBox())!];
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
  const pickHere = page.getByRole('link', { name: compass.pickHere });
  await expect(pickHere).toHaveAttribute('href', '/harbour?bar=Attaboy&lat=40.7224&lon=-73.9883');
  await pickHere.click();

  // The harbour starts at the bar's menu.
  await expect(page.getByRole('heading', { name: harbour.menuTitle })).toBeVisible();
  const add = page.getByLabel(harbour.addLabel);
  await add.fill('Negroni');
  await add.press('Enter');
  await page.getByRole('button', { name: harbour.next }).click();
  await page.getByRole('button', { name: harbour.pickThis }).click();
  await page.getByRole('link', { name: harbour.rateNow }).click();

  // Rated at the bar the map named: the pour records where it is.
  await expect(page.getByRole('heading', { name: ratePage.heading })).toBeVisible();
  await page.getByRole('radio', { name: /^7:/ }).click();
  await page.getByRole('button', { name: pour.submit }).click();
  await expect(page.getByRole('heading', { name: 'Your coordinate moved.' })).toBeVisible();

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('guest_pours') ?? '[]'));
  expect(saved[0].venue).toEqual({
    entity: { name: 'Attaboy' },
    address: { $type: GEO_TYPE, latitude: '40.722400', longitude: '-73.988300', name: 'Attaboy' },
  });
  await context.close();
});

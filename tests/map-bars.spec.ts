import { test, expect, type Page } from '@playwright/test';
import { appPath } from './app-path';
import { chart, coldState, compass, explore, menu, moved, pour, ratePage, waitingPick } from '../src/lib/copy';
import { GEO_TYPE } from '../src/lib/atproto/location';

/**
 * A bar is a filter on your map: its menu's drinks become numbered pins, the
 * card lists them in the same order, and a pick there waits on the device
 * until it is rated — at the bar, with where the bar is. Bars are found by
 * name or near you, never on a street map.
 */

const profile = { x: 4, y: -2, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false, vibeTags: {} };
const here = { latitude: 40.722349, longitude: -73.988312 };
const overpass = {
  elements: [
    { type: 'node', id: 1, lat: 40.7224, lon: -73.9883, tags: { amenity: 'bar', name: 'Attaboy' } },
    { type: 'node', id: 2, lat: 40.7236, lon: -73.9872, tags: { amenity: 'pub', name: 'The Corner Pub' } },
  ],
};
const seedOnce = (p: typeof profile) => {
  if (!sessionStorage.getItem('seeded')) {
    localStorage.setItem('user_profile', JSON.stringify(p));
    sessionStorage.setItem('seeded', '1');
  }
};
const card = (page: Page) => page.getByRole('region', { name: explore.cardLabel });
const rating = (page: Page) => page.getByRole('region', { name: ratePage.title });
const theMap = (page: Page) => page.locator(`[role="group"][aria-label="${explore.mapLabel}"]`);
const search = (page: Page) => page.getByRole('searchbox', { name: compass.searchLabel });

test('A menu: with no coordinate, it says what it needs', async ({ page }) => {
  await page.goto('/?menu=1');
  await expect(page.getByText(menu.coldBody)).toBeVisible();
  await expect(page.getByRole('link', { name: compass.findYours })).toHaveAttribute('href', '/?quiz=1');
});

test('A menu with a bar: pinned on the map, ranked in the card, picked — then the pick waits and rating opens a draft', async ({ page }) => {
  await page.addInitScript(seedOnce, profile);
  await page.goto(appPath);
  await card(page).getByRole('button', { name: compass.haveMenu }).click();

  // A bar can still be named, and nothing is ranked until there is something to rank.
  await page.getByLabel(compass.atMenu.barLabel).fill('Attaboy');
  await expect(page.getByRole('button', { name: chart.pickThis })).toHaveCount(0);
  // The map is empty under a menu with nothing on it.
  await expect(theMap(page).getByText(explore.noMenu)).toBeVisible();

  const add = page.getByLabel(compass.atMenu.addLabel);
  for (const drink of ['Last Word', 'negroni', 'House Special']) {
    await add.fill(drink);
    await add.press('Enter');
  }
  await expect(page.getByText(compass.atMenu.placed, { exact: true })).toHaveCount(2);
  await expect(page.getByText(compass.atMenu.unplaced, { exact: true })).toHaveCount(1);

  // Two pins on the map, numbered as the card numbers them; every other drink is a speck.
  await expect(theMap(page).getByRole('button')).toHaveCount(2);
  await expect(theMap(page).getByRole('button', { name: 'Negroni', exact: true })).toBeVisible();

  // Ranked on your terrain, each saying what put it there, never a distance.
  await expect(page.getByRole('heading', { name: compass.atMenu.rankedAt('Attaboy') })).toBeVisible();
  const ranked = page.locator('ol').filter({ hasText: chart.reason([]) });
  await expect(ranked.getByText(chart.reason([]), { exact: true })).toHaveCount(2);
  await expect(ranked.getByLabel(/ away$/)).toHaveCount(0);

  await ranked.getByRole('button', { name: /Negroni/ }).click();
  await page.getByRole('button', { name: chart.pickThis }).click();

  // Back to where to next: the pick waits, and rating it opens the card on a draft with no rating in it.
  await expect(page.getByText(waitingPick.waiting)).toBeVisible();
  await expect(theMap(page).getByRole('button')).not.toHaveCount(2);
  await page.getByRole('button', { name: new RegExp(waitingPick.rate) }).click();
  await expect(rating(page).getByLabel(pour.drinkLabel)).toHaveValue('Negroni');
  await expect(rating(page).getByLabel(pour.barLabel)).toHaveValue('Attaboy');
  await expect(rating(page).getByText(pour.tapRating, { exact: true })).toBeVisible();
  await rating(page).getByRole('button', { name: ratePage.close }).click();
  await expect(rating(page)).toHaveCount(0);

  await page.getByRole('button', { name: waitingPick.dismiss }).click();
  await expect(page.getByText(waitingPick.waiting)).toHaveCount(0);
});

test('A menu with no bar named is a pick at home', async ({ page }) => {
  await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.goto('/?menu=1');
  const add = page.getByLabel(compass.atMenu.addLabel);
  await add.fill('Negroni');
  await add.press('Enter');
  await page.getByRole('button', { name: chart.pickThis }).click();
  await expect(page.getByText(waitingPick.atHome)).toBeVisible();
});

test('A drink found in the header can be picked, too', async ({ page }) => {
  await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.goto(appPath);
  await search(page).fill('negroni');
  await page.locator('[data-result]').first().click();
  await card(page).getByRole('button', { name: chart.pickThis }).click();
  await expect(page.getByText(waitingPick.waiting)).toBeVisible();
});

test('A bar typed in the header opens as a filter on the map, its name in the search box', async ({ page }) => {
  await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.goto(appPath);
  await search(page).fill('Attaboy');
  await page.getByRole('button', { name: new RegExp(compass.pickAt('Attaboy')) }).click();
  await expect(page).toHaveURL(/\/(\?q=)?$/);
  await expect(card(page).getByRole('heading', { name: 'Attaboy' })).toBeVisible();
  await expect(page.locator('#map-search').getByText('Attaboy')).toBeVisible();
  await expect(search(page)).toHaveAttribute('placeholder', explore.searchThisMenu);
  // Leaving the bar puts the whole map back.
  await page.getByRole('button', { name: explore.leave('Attaboy') }).click();
  await expect(card(page).getByRole('heading', { name: compass.menuTitle })).toBeVisible();
});

test('A bar never seen is offered by the name typed, and what is in a drink is not', async ({ page }) => {
  await page.goto(appPath);
  await search(page).fill('Bar Goto');
  await expect(page.getByRole('button', { name: new RegExp(compass.pickAt('Bar Goto')) })).toBeVisible();
  await search(page).fill('mezcal');
  await expect(page.locator('[data-result]').first()).toBeVisible();
  await expect(page.getByRole('button', { name: new RegExp(compass.pickAt('mezcal')) })).toHaveCount(0);
});

test('A drink searched by what is in it opens in the card, and Rate this rates it there', async ({ page }) => {
  await page.goto(appPath);
  await search(page).fill('mezcal');
  const first = page.locator('[data-result]').first();
  const drink = (await first.locator('.font-serif').textContent())!.trim();
  await first.click();
  await expect(card(page).getByRole('heading', { name: drink, level: 1 })).toBeVisible();
  await card(page).getByRole('button', { name: chart.logThis }).click();
  await expect(page).toHaveURL(/:\d+\/(\?|$)/);
  // A guest with no coordinate starts from the cold state; the drink waits.
  const asGuest = rating(page).getByRole('button', { name: coldState.guestCta });
  const form = rating(page).getByRole('heading', { name: ratePage.heading });
  await expect(asGuest.or(form)).toBeVisible();
  if (await asGuest.isVisible()) await asGuest.click();
  await expect(rating(page).getByRole('heading', { name: ratePage.heading })).toBeVisible();
  await expect(page.getByLabel(pour.drinkLabel)).toHaveValue(drink);
});

test('A drink the map does not know can still be rated, and the pour says it moved nothing', async ({ page }) => {
  await page.addInitScript(seedOnce, profile);
  await page.goto(appPath);
  await search(page).fill('Retsina');
  await expect(page.getByText(compass.noDrinks)).toBeVisible();
  await page.getByRole('button', { name: compass.rateUnlisted('Retsina') }).click();

  await expect(page).toHaveURL(/\/(\?q=)?$/);
  await expect(page.getByLabel(pour.drinkLabel)).toHaveValue('Retsina');
  await expect(page.getByText(pour.unlisted('Retsina'))).toBeVisible();
  await page.getByRole('button', { name: pour.atHome }).click();
  // No rating is preset: logging asks for one first.
  await page.getByRole('button', { name: pour.submit }).click();
  await expect(page.getByText(pour.needRating)).toBeVisible();
  await page.getByRole('radio', { name: /^7:/ }).click();
  await page.getByRole('button', { name: pour.submit }).click();

  await expect(page.getByRole('heading', { name: moved.unlistedTitle })).toBeVisible();
  await expect(page.getByText(moved.unlisted('Retsina'), { exact: false })).toBeVisible();
  await expect(page.getByText(moved.offMenu)).toHaveCount(0);
});

test('A drink is found by another name it goes by', async ({ page }) => {
  await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.goto(appPath);
  await search(page).fill('Prosecco DOC');
  await expect(page.locator('[data-result]').filter({ hasText: /^Prosecco/ }).first()).toBeVisible();
  await expect(page.getByText(compass.noDrinks)).toHaveCount(0);
});

test('Bars near you: nothing is sent until asked', async ({ page }) => {
  let asked = false;
  await page.route('https://overpass-api.de/**', (r) => ((asked = true), r.abort()));
  await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.goto(appPath);
  await expect(page.getByRole('button', { name: compass.showNear })).toBeVisible();
  await expect(page.getByText(compass.nearNote)).toBeVisible();
  expect(asked).toBe(false);
});

test('Bars near you: a device that cannot find itself is not told location is off, and can try again', async ({ page }) => {
  await page.addInitScript((p) => {
    localStorage.setItem('user_profile', JSON.stringify(p));
    // A timeout (code 3), as a desktop without a fix gives.
    navigator.geolocation.getCurrentPosition = (_ok, fail) =>
      fail?.({ code: 3, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: 'Timeout' } as GeolocationPositionError);
  }, profile);
  await page.goto(appPath);
  await page.getByRole('button', { name: compass.showNear }).click();
  await expect(page.getByText(compass.unlocated)).toBeVisible();
  await expect(page.getByText(compass.denied)).toHaveCount(0);
  await expect(page.getByRole('button', { name: compass.retry })).toBeVisible();
});

test('Bars near you: Overpass giving up reads as no answer, not as no bars', async ({ browser }) => {
  const context = await browser.newContext({ permissions: ['geolocation'], geolocation: here });
  const page = await context.newPage();
  await page.route('https://overpass-api.de/**', (r) =>
    r.fulfill({ json: { elements: [], remark: 'runtime error: Query timed out in "query" at line 1 after 26 seconds.' } })
  );
  await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.goto(appPath);
  await expect(page.getByText(compass.failed)).toBeVisible();
  await expect(page.getByText(compass.noneNear)).toHaveCount(0);
  await context.close();
});

test('Bars near you, then a pick there, then a pour that says where the bar is', async ({ browser }) => {
  const context = await browser.newContext({ permissions: ['geolocation'], geolocation: here });
  const page = await context.newPage();
  let sent = '';
  await page.route('https://overpass-api.de/**', (r) => {
    sent = decodeURIComponent(r.request().postData() ?? '');
    return r.fulfill({ json: overpass });
  });
  await page.addInitScript(seedOnce, profile);

  // Location already allowed: the list fills on its own, and the point went out rounded.
  await page.goto(appPath);
  const near = card(page).getByRole('region', { name: explore.barsNear });
  await expect(near.getByRole('button', { name: /Attaboy/ })).toBeVisible();
  expect(sent).toContain('40.722,-73.988');
  expect(sent).not.toContain('40.722349');

  // A bar opens as a filter on the map, carrying where it is; its name needs no typing.
  await near.getByRole('button', { name: /Attaboy/ }).click();
  await expect(card(page).getByRole('heading', { name: 'Attaboy' })).toBeVisible();
  await expect(page.getByLabel(compass.atMenu.barLabel)).toHaveCount(0);
  const add = page.getByLabel(compass.atMenu.addLabel);
  await add.fill('Negroni');
  await add.press('Enter');
  await page.getByRole('button', { name: chart.pickThis }).click();

  // The pick waits, and rating it opens the draft.
  await expect(page.getByText(waitingPick.waiting)).toBeVisible();
  await page.getByRole('button', { name: new RegExp(waitingPick.rate) }).click();

  // Rated at the bar the list named: the pour records where it is.
  await expect(rating(page).getByRole('heading', { name: ratePage.heading })).toBeVisible();
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

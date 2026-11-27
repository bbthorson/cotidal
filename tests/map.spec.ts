import { test, expect } from '@playwright/test';
import { a11y, chart, quadrants, coldState, compass, explore, mapPage, moved, nav, pour, ratePage, taste } from '../src/lib/copy';

/**
 * The app is one screen, the map: the search in the header, your map fixed
 * in place, and one card — your menu, a bar, a drink, rating a pour, your
 * pours. These hold the screen's contract; a bar's menu is map-bars.spec.ts.
 */

const profile = { x: 4, y: -2, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false, vibeTags: {} };
const seed = (p: typeof profile) => {
  if (!sessionStorage.getItem('seeded')) {
    localStorage.setItem('user_profile', JSON.stringify(p));
    sessionStorage.setItem('seeded', '1');
  }
};
const theMap = (page: import('@playwright/test').Page) => page.locator(`[role="group"][aria-label="${explore.mapLabel}"]`);
const card = (page: import('@playwright/test').Page) => page.getByRole('region', { name: explore.cardLabel });
const rating = (page: import('@playwright/test').Page) => page.getByRole('region', { name: ratePage.title });

test('Map: one screen, the search in its card, and one action of its own', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(seed, profile);
  await page.goto('/map');
  // The search is content, not navigation: the first thing in the card, not in the app bar, which names the page.
  const header = page.locator('header');
  await expect(header.getByRole('searchbox')).toHaveCount(0);
  await expect(header.getByTestId('page-name')).toHaveText(nav.map);
  await expect(card(page).getByRole('searchbox', { name: compass.searchLabel })).toBeVisible();
  await expect(header.locator('summary')).toHaveText(nav.menu);
  await expect(page.locator('footer')).toHaveCount(0);
  await expect(theMap(page)).toBeVisible();
  // The card's one action is rating; choosing a drink is the map's, the search's and the card's lists.
  await expect(card(page).getByRole('button', { name: mapPage.rateDrink })).toHaveCount(1);
  // On a phone the visible reading pages are in Menu.
  await header.locator('summary').click();
  const menuNav = page.getByRole('navigation', { name: a11y.mainNav });
  await expect(menuNav.getByRole('link', { name: nav.howItWorks })).toHaveAttribute('href', '/?about=1#how-it-works');
});

test('Map: the search works before the map does, as a plain form drawn by the server', async ({ request }) => {
  const html = await (await request.get('/map?q=negroni')).text();
  const search = html.slice(html.indexOf('id="map-search"'));
  expect(search).toContain('action="/map"');
  expect(search.slice(0, 2000)).toContain('value="negroni"');
  // Only the map has it.
  const drinks = await (await request.get('/drinks/negroni')).text();
  expect(drinks).not.toContain('id="map-search"');
});

test('Map: the server draws the map whole, so it is there before any script runs', async ({ browser }) => {
  // Before, the map measured its box after mount and the server sent an empty space.
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/map');
  const map = theMap(page);
  await expect(map).toBeVisible();
  const box = (await map.boundingBox())!;
  expect(box.width).toBeGreaterThan(200);
  expect(Math.abs(box.width - box.height)).toBeLessThan(2);
  // Every drink is drawn, and the regions are named.
  await expect(map.getByText(quadrants[0].name)).toBeVisible();
  await context.close();
});

test('Map: with no coordinate the card asks one thing, and the search still finds drinks', async ({ page }) => {
  await page.goto('/map');
  await expect(card(page).getByText(coldState.title)).toBeVisible();
  await expect(card(page).getByRole('heading', { name: compass.menuTitle })).toHaveCount(0);
  await page.getByRole('searchbox', { name: compass.searchLabel }).fill('negroni');
  await expect(page.locator('[data-result]').first()).toContainText('Negroni');
  await page.keyboard.press('Escape');
  // The questions open in the card, in place: no page of their own.
  await card(page).getByRole('link', { name: coldState.quizCta }).click();
  await expect(page).toHaveURL(/\/map$/);
  await expect(card(page).getByRole('group', { name: a11y.answerOptions })).toBeVisible();
});

test('Map: your menu says what put each drink there, and a drink opens in the card', async ({ page }) => {
  await page.addInitScript(seed, profile);
  await page.goto('/map');
  await expect(card(page).getByRole('heading', { name: compass.menuTitle })).toBeVisible();
  // With nothing rated, it is where your answers put you; never a score, never a distance.
  expect(await card(page).getByText(chart.reason([]), { exact: true }).count()).toBeGreaterThan(1);
  await expect(page.getByLabel(/ away$/)).toHaveCount(0);
  await expect(page.getByText(taste.label)).toBeVisible();

  // A drink found in the header opens in the card, and is ringed on the map.
  await page.getByRole('searchbox', { name: compass.searchLabel }).fill('negroni');
  await page.locator('[data-result]').first().click();
  await expect(card(page).getByRole('heading', { name: 'Negroni', level: 1 })).toBeVisible();
  await expect(theMap(page).getByRole('button', { name: 'Negroni', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await card(page).getByRole('button', { name: new RegExp(explore.backToStart) }).click();
  await expect(card(page).getByRole('heading', { name: compass.menuTitle })).toBeVisible();
});

test('Map: rating happens in the card, and a guest’s pour is kept on the device', async ({ page }) => {
  await page.addInitScript(seed, profile);
  await page.goto('/map');
  await card(page).getByRole('button', { name: mapPage.rateDrink }).click();
  await expect(rating(page).getByRole('heading', { name: ratePage.heading })).toBeVisible();
  // No dialog: the card holds it, and Close takes it away.
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await rating(page).getByRole('button', { name: ratePage.close }).click();
  await expect(rating(page)).toHaveCount(0);

  // A drink handed over in the address opens the form on it; the address is cleaned once rated.
  await page.goto('/map?rate=Negroni');
  await expect(rating(page).getByLabel(pour.drinkLabel)).toHaveValue('Negroni');
  await rating(page).getByRole('group', { name: pour.whereLabel }).getByRole('button', { name: pour.atHome }).click();
  await page.getByRole('radio', { name: /^7:/ }).click();
  await page.getByRole('button', { name: pour.submit }).click();
  // The move is drawn on the map itself, not a second chart: a trail to your point, the drink marked.
  await expect(theMap(page).locator('[data-trail]')).toHaveCount(1);
  await expect(theMap(page).getByRole('img', { name: /^Your coordinate, now in / })).toBeVisible();
  await page.getByRole('button', { name: moved.back }).click();
  await expect(theMap(page).locator('[data-trail]')).toHaveCount(0);

  await expect(page).toHaveURL(/\/map$/);
  await expect(rating(page)).toHaveCount(0);
  await expect(page.locator('ol').filter({ hasText: '7 of 9' })).toContainText('Negroni');
  // On the map, with your rating beside it.
  await expect(theMap(page).getByRole('button', { name: explore.ratedMark('Negroni', 7) })).toHaveCount(1);
  await page.reload();
  await expect(page.locator('ol').filter({ hasText: '7 of 9' })).toContainText('Negroni');
});

test('Map: your pours, your track, and what each pour did to it', async ({ page }) => {
  await page.goto('/map');
  await card(page).getByRole('button', { name: coldState.guestCta }).click();

  // Two pours as a guest, from the centre: one liked, which moves you, and one in the middle, which holds you.
  for (const [drink, score] of [['Negroni', 9], ['Margarita', 5]] as const) {
    if (!(await rating(page).isVisible())) await card(page).getByRole('button', { name: mapPage.rateDrink }).click();
    await rating(page).getByLabel(pour.drinkLabel).fill(drink);
    await rating(page).getByRole('group', { name: pour.whereLabel }).getByRole('button', { name: pour.atHome }).click();
    await rating(page).getByRole('radio', { name: new RegExp(`^${score}:`) }).click();
    await rating(page).getByRole('button', { name: pour.submit }).click();
    await expect(rating(page).getByRole('heading', { level: 1 })).toHaveText(score === 5 ? moved.heldTitle : /^Moved \d/);
    await rating(page).getByRole('button', { name: moved.back }).click();
    await expect(rating(page)).toHaveCount(0);
  }

  await expect(page.getByText(taste.label)).toBeVisible();
  await expect(page.getByRole('figure', { name: mapPage.trackLabel(2) })).toBeVisible();
  const log = page.locator('ol').filter({ hasText: mapPage.startedCentre });
  await expect(log.getByRole('listitem').first()).toContainText(mapPage.held);
  await expect(log.getByRole('listitem').nth(1)).toContainText(/Moved \d/);
  await expect(log.getByRole('listitem').last()).toContainText(mapPage.startedCentre);

  // A pour on the map is a mark to tap: it opens the drink, with your last pour of it.
  await theMap(page).getByRole('button', { name: explore.ratedMark('Negroni', 9) }).click();
  await expect(card(page).getByText(chart.lastPour)).toBeVisible();

  // Comparing is on a member's public map; a guest, who has none, is not offered it.
  await expect(page.getByRole('link', { name: new RegExp(mapPage.compareLink) })).toHaveCount(0);
});

test('Map: the card sits beside the map on a wide screen, under it on a phone', async ({ page }) => {
  await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/map');
  await expect(card(page).getByRole('heading', { name: compass.menuTitle })).toBeVisible();
  const [c, m] = [(await card(page).boundingBox())!, (await theMap(page).boundingBox())!];
  expect(c.x + c.width).toBeLessThan(m.x);
  // The visible reading pages are in the header beside the search, since the map has no footer.
  await expect(page.locator('header a[href="/?about=1#how-it-works"]')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => {
    const [c2, m2] = [(await card(page).boundingBox())!, (await theMap(page).boundingBox())!];
    return c2.y >= m2.y + m2.height - 1;
  }).toBe(true);

  // As on every page, the card is the page's scroll: scrolling pulls it up over the map, and its app bar sticks to the top.
  const restTop = (await card(page).boundingBox())!.y;
  await page.mouse.wheel(0, 600);
  await expect.poll(async () => (await card(page).boundingBox())!.y).toBeLessThan(restTop - 300);
  const barTop = async () => (await page.locator('header').first().boundingBox())!.y;
  await expect.poll(barTop).toBeLessThan(16);
  const stuck = await barTop();
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(300);
  expect(Math.abs((await barTop()) - stuck)).toBeLessThan(1);
  // There is no handle to drag and no More: pulling is scrolling.
  await expect(card(page).getByRole('button', { name: /^(More|Less)$/ })).toHaveCount(0);

  // A drink is a place on the map: opening one scrolls back, so the map shows and pushes the card down.
  await card(page).locator('ol li button').first().click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
  await expect(card(page).getByRole('heading', { level: 1 })).toBeVisible();

  // Rating needs the room: it scrolls the card up to the top of the screen.
  await card(page).getByRole('button', { name: chart.logThis }).click();
  await expect.poll(async () => Math.abs((await card(page).boundingBox())!.y)).toBeLessThan(2);
});

test('Map: Rate a drink floats at a phone\'s thumb on where to next, sits in the card\'s head from lg, and gives way to a drink\'s own', async ({ page }) => {
  await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/map');
  const rate = page.getByRole('button', { name: mapPage.rateDrink });
  await expect(rate).toHaveCount(1);
  const box = (await rate.boundingBox())!;
  expect(box.y + box.height).toBeGreaterThan(844 - 80);
  expect(box.x + box.width).toBeGreaterThan(390 - 40);
  // Where to next is a heading for a screen reader, not a title on the screen.
  await expect(page.getByRole('heading', { name: explore.heading })).toHaveClass(/sr-only/);

  // A drink carries its own action.
  await page.getByRole('searchbox', { name: compass.searchLabel }).fill('negroni');
  await page.locator('[data-result]').first().click();
  await expect(card(page).getByRole('heading', { name: 'Negroni', level: 1 })).toBeVisible();
  await expect(rate).toHaveCount(0);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/map');
  await expect(rate).toHaveCount(1);
  const [b, c] = [(await rate.boundingBox())!, (await card(page).boundingBox())!];
  expect(b.x + b.width).toBeLessThanOrEqual(c.x + c.width);
  expect(b.y).toBeLessThan(c.y + 200);
});

test('Map: the map stays where it is when a bar or a drink is opened', async ({ page }) => {
  await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.goto('/map');
  const frame = theMap(page);
  await expect(frame).toBeVisible();
  const before = await frame.boundingBox();
  await page.getByRole('searchbox', { name: compass.searchLabel }).fill('negroni');
  await page.locator('[data-result]').first().click();
  await expect(card(page).getByRole('heading', { name: 'Negroni', level: 1 })).toBeVisible();
  expect(await frame.boundingBox()).toEqual(before);
});

test('Rating in the card: what is missing is said under its field, and the field takes focus', async ({ page }) => {
  await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.goto('/map?rate=Negroni');
  const sheet = rating(page);
  await sheet.getByRole('radio', { name: /^8:/ }).click();
  // "At a bar" with no bar named.
  await sheet.getByRole('button', { name: pour.submit }).click();
  const bar = sheet.getByLabel(pour.barLabel);
  await expect(bar).toBeFocused();
  await expect(bar).toHaveAccessibleDescription(pour.needBar);
  // Naming it takes the message away.
  await bar.fill('Attaboy');
  await expect(sheet.getByText(pour.needBar)).toHaveCount(0);
});

test('Map: a search is a filter — the map draws what it finds, and the staples come back when it is cleared', async ({ page }) => {
  // Smoke is avoided, so the mezcal drinks are off this menu; a search still finds them.
  await page.addInitScript(seed, { ...profile, dislikesSmoke: true });
  await page.goto('/map');
  const map = theMap(page);
  // Unfiltered, the staples: a Mojito, and no Mezcal Negroni (in the library, not a staple).
  await expect(map.getByRole('button', { name: 'Mojito', exact: true })).toHaveCount(1);
  await expect(map.getByRole('button', { name: 'Mezcal Negroni', exact: true })).toHaveCount(0);
  // By what is in them: every mezcal drink, and nothing else.
  const search = page.getByRole('searchbox', { name: compass.searchLabel });
  await search.fill('mezcal');
  await expect(map.getByRole('button', { name: 'Mezcal Negroni', exact: true })).toHaveCount(1);
  await expect(map.getByRole('button', { name: 'Mezcal Paloma', exact: true })).toHaveCount(1);
  await expect(map.getByRole('button', { name: 'Mojito', exact: true })).toHaveCount(0);
  await expect(card(page).getByRole('button', { name: /^Mezcal Negroni/ })).toHaveCount(1);
  // Found nothing: the map is left as it was.
  await search.fill('zzzz');
  await expect(map.getByRole('button', { name: 'Mojito', exact: true })).toHaveCount(1);
  await search.fill('');
  await expect(map.getByRole('button', { name: 'Mojito', exact: true })).toHaveCount(1);
  await expect(map.getByRole('button', { name: 'Mezcal Negroni', exact: true })).toHaveCount(0);
});

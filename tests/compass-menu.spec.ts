import { test, expect } from '@playwright/test';
import { chart, compass, menu, pour, ratePage, waitingPick } from '../src/lib/copy';

const profile = { x: 4, y: -2, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false, vibeTags: {} };

// Choosing what to have happens on Compass: a menu, ranked for you, and a pick
// that waits on the device until it is rated.

test('Compass menu: with no coordinate, it says what it needs', async ({ page }) => {
  await page.goto('/compass?menu=1');
  await expect(page.getByText(menu.coldBody)).toBeVisible();
  await expect(page.getByRole('link', { name: compass.findYours })).toHaveAttribute('href', '/questions');
});

test('Compass menu: a menu with a bar, ranked, picked — then the pick waits and rating opens a draft', async ({ page }) => {
  await page.addInitScript((p) => {
    // Only on the first load: the flow writes its own pick after.
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('user_profile', JSON.stringify(p));
      sessionStorage.setItem('seeded', '1');
    }
  }, profile);
  await page.goto('/compass');
  await page.getByRole('button', { name: compass.haveMenu }).click();

  // A bar can still be named, and nothing is ranked until there is something to rank.
  await page.getByLabel(compass.atMenu.barLabel).fill('Attaboy');
  await expect(page.getByRole('button', { name: chart.pickThis })).toHaveCount(0);

  // Two drinks on the map and one the map does not know.
  const add = page.getByLabel(compass.atMenu.addLabel);
  for (const drink of ['Last Word', 'negroni', 'House Special']) {
    await add.fill(drink);
    await add.press('Enter');
  }
  await expect(page.getByText(compass.atMenu.placed, { exact: true })).toHaveCount(2);
  await expect(page.getByText(compass.atMenu.unplaced, { exact: true })).toHaveCount(1);

  // Ranked, closest first; the unplaced line is not ranked.
  await expect(page.getByRole('heading', { name: compass.atMenu.rankedAt('Attaboy') })).toBeVisible();
  const scores = await page.getByLabel(/^Closeness \d+$/).evaluateAll((els) => els.map((el) => Number(el.textContent)));
  expect(scores).toHaveLength(2);
  expect(scores).toEqual([...scores].sort((a, b) => b - a));

  await page.getByRole('button', { name: /Negroni.*Closeness/ }).click();
  await page.getByRole('button', { name: chart.pickThis }).click();

  // Back on Compass, the pick waits, and rating opens the sheet on a draft with no rating in it.
  await expect(page.getByText(waitingPick.waiting)).toBeVisible();
  await page.getByRole('button', { name: new RegExp(waitingPick.rate) }).click();
  const sheet = page.getByRole('dialog', { name: ratePage.title });
  await expect(sheet.getByLabel(pour.drinkLabel)).toHaveValue('Negroni');
  await expect(sheet.getByLabel(pour.barLabel)).toHaveValue('Attaboy');
  await expect(sheet.getByText(pour.tapRating, { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);

  await page.getByRole('button', { name: waitingPick.dismiss }).click();
  await expect(page.getByText(waitingPick.waiting)).toHaveCount(0);
});

test('Compass menu: no bar named means at home', async ({ page }) => {
  await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.goto('/compass?menu=1');
  const add = page.getByLabel(compass.atMenu.addLabel);
  await add.fill('Negroni');
  await add.press('Enter');
  await page.getByRole('button', { name: chart.pickThis }).click();
  await expect(page.getByText(waitingPick.atHome)).toBeVisible();
});

test('Compass: a drink from the general list can be picked, too', async ({ page }) => {
  await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.goto('/compass');
  await page.getByRole('searchbox', { name: compass.searchLabel }).fill('negroni');
  await page.locator('ol > li').first().getByRole('button').click();
  await page.getByRole('button', { name: chart.pickThis }).click();
  await expect(page.getByText(waitingPick.waiting)).toBeVisible();
});

test('Compass: a typed bar opens its menu in place', async ({ page }) => {
  await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.goto('/compass');
  await page.getByRole('searchbox', { name: compass.searchLabel }).fill('Attaboy');
  await page.getByRole('button', { name: new RegExp(compass.pickAt('Attaboy')) }).click();
  await expect(page).toHaveURL(/\/compass$/);
  await expect(page.getByRole('heading', { name: 'Attaboy' })).toBeVisible();
});

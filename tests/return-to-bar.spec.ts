import { test, expect, type Page } from '@playwright/test';
import { appPath } from './app-path';
import { chart, compass, explore, moved } from '../src/lib/copy';

const profile = { x: -5, y: -5, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false, vibeTags: {} };

const seedOnce = (p: typeof profile) => {
  if (!sessionStorage.getItem('seeded')) {
    localStorage.setItem('user_profile', JSON.stringify(p));
    sessionStorage.setItem('seeded', '1');
  }
};

const card = (page: Page) => page.getByRole('region', { name: explore.cardLabel });
const search = (page: Page) => page.getByRole('searchbox', { name: compass.searchLabel });

test('Return to bar: after rating a pick at a bar, Done returns to that bar re-ranked and names the drink that rose', async ({ page }) => {
  await page.addInitScript(seedOnce, profile);
  await page.goto(appPath);

  // Open Attaboy via search and add three drinks.
  await search(page).fill('Attaboy');
  await page.getByRole('button', { name: new RegExp(compass.pickAt('Attaboy')) }).click();
  await expect(card(page).getByRole('heading', { name: 'Attaboy', exact: true })).toBeVisible();

  const add = page.getByLabel(compass.atMenu.addLabel);
  for (const drink of ['Negroni', 'Last Word', 'Daiquiri']) {
    await add.fill(drink);
    await add.press('Enter');
  }

  // Pick the #1 ranked drink (Negroni in The Deep for (-5, -5)).
  const ranked = page.locator('ol').filter({ hasText: 'Negroni' });
  const firstDrink = (await ranked.locator('li').first().locator('.font-serif').textContent())!.trim();
  const secondDrink = (await ranked.locator('li').nth(1).locator('.font-serif').textContent())!.trim();
  await page.getByRole('button', { name: chart.pickThis }).click();

  // Rate it low (2) inline on the waiting pick so it drops off the bar's ranked menu and #2 rises to No. 1.
  const strip = page.getByTestId('waiting-pick');
  await expect(strip).toContainText(firstDrink);
  await strip.getByRole('radio', { name: /^2:/ }).click();
  await expect(page.getByRole('heading', { name: /^Moved \d/ })).toBeVisible();

  // Done returns to Attaboy (not where to next), re-ranked, naming the drink that rose.
  await page.getByRole('button', { name: moved.back }).click();
  await expect(card(page).getByRole('heading', { name: 'Attaboy', exact: true })).toBeVisible();
  await expect(page.getByTestId('bar-reranked')).toContainText(compass.atMenu.drinkRose(secondDrink, 1));

  // Reloading keeps the open bar active until left.
  await page.reload();
  await expect(card(page).getByRole('heading', { name: 'Attaboy', exact: true })).toBeVisible();

  // Leaving the bar clears it so a reload returns to where to next.
  await page.getByRole('button', { name: explore.leave('Attaboy') }).click();
  await expect(card(page).getByRole('heading', { name: compass.newTitle })).toBeVisible();
  await page.reload();
  await expect(card(page).getByRole('heading', { name: compass.newTitle })).toBeVisible();
});

test('Return to bar: an open bar older than a few hours expires on return', async ({ page }) => {
  const expiredAt = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
  await page.addInitScript(
    ({ p, bar }) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('user_profile', JSON.stringify(p));
        localStorage.setItem('open_bar', JSON.stringify(bar));
        sessionStorage.setItem('seeded', '1');
      }
    },
    { p: profile, bar: { name: 'Attaboy', lines: ['Negroni'], openedAt: expiredAt } }
  );
  await page.goto(appPath);
  await expect(card(page).getByRole('heading', { name: compass.newTitle })).toBeVisible();
  const stored = await page.evaluate(() => localStorage.getItem('open_bar'));
  expect(stored).toBeNull();
});

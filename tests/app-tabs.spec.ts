import { test, expect } from '@playwright/test';
import { a11y, appBar, chart, coldState, mapPage, menu, moved, pour, ratePage } from '../src/lib/copy';

const profile = { x: 4, y: -2, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false, vibeTags: {} };

test('App bar: Compass · Log, and Log has one action of its own', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/compass');
  const bar = page.getByRole('navigation', { name: appBar.label });
  await expect(bar.getByRole('link')).toHaveText([appBar.compass, appBar.map]);
  await expect(bar.getByRole('link', { name: appBar.compass })).toHaveAttribute('aria-current', 'page');

  // The header is the same on an app page as on a reading page: wordmark · Menu.
  await expect(page.locator('header summary')).toBeVisible();

  // Log's one action is rating; choosing a drink is the Compass tab's.
  await page.evaluate((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.goto('/map');
  await expect(page.getByRole('button', { name: mapPage.rateDrink })).toHaveCount(1);
  await expect(page.locator('.btn-primary:visible')).toHaveCount(1);
});

test('Your map: a guest’s pour is kept on the device', async ({ page }) => {
  await page.addInitScript((p) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('user_profile', JSON.stringify(p));
      sessionStorage.setItem('seeded', '1');
    }
  }, profile);

  // Log shows the log, not a form: rating is a sheet it opens.
  await page.goto('/map');
  await expect(page.getByRole('heading', { name: mapPage.heading, level: 1 })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const sheet = page.getByRole('dialog', { name: ratePage.title });
  await page.getByRole('button', { name: mapPage.rateDrink }).click();
  await expect(sheet.getByRole('heading', { name: ratePage.heading })).toBeVisible();
  // Escape closes it, and focus returns to what opened it.
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole('button', { name: mapPage.rateDrink })).toBeFocused();

  // A drink handed over in the address opens the form on it; the address is cleaned on close.
  await page.goto('/map?rate=Negroni');
  await expect(sheet.getByRole('heading', { name: ratePage.heading })).toBeVisible();
  await expect(sheet.getByLabel(pour.drinkLabel)).toHaveValue('Negroni');
  await sheet.getByRole('group', { name: pour.whereLabel }).getByRole('button', { name: pour.atHome }).click();
  await page.getByRole('radio', { name: /^7:/ }).click();
  await page.getByRole('button', { name: pour.submit }).click();
  await page.getByRole('button', { name: moved.back }).click();

  // Rated: back on the ledger, which already shows it, and the pour survives a reload.
  await expect(page).toHaveURL(/\/map$/);
  await expect(sheet).toHaveCount(0);
  await expect(page.locator('ol').filter({ hasText: '7 of 9' })).toContainText('Negroni');
  await page.reload();
  await expect(page.locator('ol').filter({ hasText: '7 of 9' })).toContainText('Negroni');

});

test('Your map: your track, and what each pour did to it', async ({ page }) => {
  await page.goto('/map');
  await page.getByRole('button', { name: coldState.guestCta }).click();

  // Two pours as a guest, from the centre: one liked, which moves you, and one in the middle, which holds you.
  const sheet = page.getByRole('dialog', { name: ratePage.title });
  for (const [drink, score] of [['Negroni', 9], ['Margarita', 5]] as const) {
    if (!(await sheet.isVisible())) await page.getByRole('button', { name: mapPage.rateDrink }).click();
    await sheet.getByLabel(pour.drinkLabel).fill(drink);
    await sheet.getByRole('group', { name: pour.whereLabel }).getByRole('button', { name: pour.atHome }).click();
    await sheet.getByRole('radio', { name: new RegExp(`^${score}:`) }).click();
    await sheet.getByRole('button', { name: pour.submit }).click();
    // The screen after says how far, or that a rating in the middle held you.
    await expect(sheet.getByRole('heading', { level: 1 })).toHaveText(score === 5 ? moved.heldTitle : /^Moved \d/);
    await sheet.getByRole('button', { name: moved.back }).click();
    await expect(sheet).toHaveCount(0);
  }

  await expect(page.getByText(menu.youAreIn)).toBeVisible();
  await expect(page.getByRole('figure', { name: mapPage.trackLabel(2) })).toBeVisible();

  // The chart of you is here: the way you came and the shoal. Compass's chart is the drinks', measured from you.
  const yours = page.getByRole('region', { name: chart.yoursLabel });
  await expect(yours).toContainText(chart.legendTrack);
  await expect(yours).toContainText(chart.legendShoal);
  // A pour on the chart is a spot to tap: it opens the drink, with your last pour of it.
  await yours.getByRole('button', { name: 'Negroni' }).click();
  await expect(page.getByText(chart.lastPour)).toBeVisible();
  await page.getByRole('button', { name: chart.close }).click();
  await expect(page.getByText(chart.lastPour)).toHaveCount(0);
  await page.goto('/compass');
  const drinks = page.getByRole('region', { name: chart.label });
  await expect(drinks).toContainText(chart.legendMenu);
  await expect(drinks).not.toContainText(chart.legendTrack);
  await expect(drinks).not.toContainText(chart.legendShoal);
  await page.goto('/map');
  const log = page.locator('ol').filter({ hasText: mapPage.startedCentre });
  await expect(log.getByRole('listitem').first()).toContainText(mapPage.held);
  await expect(log.getByRole('listitem').nth(1)).toContainText(/Moved \d/);
  await expect(log.getByRole('listitem').last()).toContainText(mapPage.startedCentre);

  // Comparing is on a member's public map; a guest, who has none, is not offered it.
  await expect(page.getByRole('link', { name: new RegExp(mapPage.compareLink) })).toHaveCount(0);

  // On a phone there is no SiteFooter on app pages: the reading pages are in the header's Menu.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('header summary').click();
  const menuNav = page.getByRole('navigation', { name: a11y.mainNav });
  await expect(menuNav.getByRole('link', { name: 'Drinks' })).toHaveAttribute('href', '/drinks');
});

test('Your map: where you are sits beside the log on a wide screen, above it on a phone', async ({ page }) => {
  await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  const where = page.getByText(menu.youAreIn);
  const ledger = page.getByRole('heading', { name: mapPage.ledgerTitle, exact: true });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/map');
  await expect(ledger).toBeVisible();
  const [w, l] = [(await where.boundingBox())!, (await ledger.boundingBox())!];
  expect(w.x + w.width).toBeLessThan(l.x);

  await page.setViewportSize({ width: 390, height: 844 });
  const [w2, l2] = [(await where.boundingBox())!, (await ledger.boundingBox())!];
  expect(w2.y + w2.height).toBeLessThan(l2.y);
});

test('Rating sheet: what is missing is said under its field, and the field takes focus', async ({ page }) => {
  await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.goto('/map?rate=Negroni');
  const sheet = page.getByRole('dialog', { name: ratePage.title });
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

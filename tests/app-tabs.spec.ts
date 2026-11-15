import { test, expect } from '@playwright/test';
import { appBar, chart, compass, logPage, moved, pour, ratePage } from '../src/lib/copy';

const profile = { x: 4, y: -2, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false, vibeTags: {} };

test('App bar: Compass · Log, and picking a drink is a button, not a tab', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/compass');
  const bar = page.getByRole('navigation', { name: appBar.label });
  await expect(bar.getByRole('link')).toHaveText([appBar.compass, appBar.log]);
  await expect(bar.getByRole('link', { name: appBar.compass })).toHaveAttribute('aria-current', 'page');
  // Compass has its own entry to a menu, so the floating button is not drawn there.
  await expect(page.getByRole('link', { name: appBar.pick, exact: true })).toHaveCount(0);

  // The app bar is a phone's navigation here: no Menu repeating it in the header.
  await expect(page.locator('header summary')).toBeHidden();

  // On Log it opens Compass on a menu.
  await page.goto('/log');
  await expect(page.getByRole('link', { name: appBar.pick, exact: true })).toHaveAttribute('href', '/compass?menu=1');
});

test('Log: a guest’s pour is kept on the device', async ({ page }) => {
  await page.addInitScript((p) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('user_profile', JSON.stringify(p));
      sessionStorage.setItem('seeded', '1');
    }
  }, profile);

  // Log shows the log, not a form: rating is a screen of its own.
  await page.goto('/log');
  await expect(page.getByRole('heading', { name: logPage.heading, level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: ratePage.heading })).toHaveCount(0);
  await expect(page.getByRole('link', { name: logPage.rateDrink })).toHaveAttribute('href', '/rate');

  // A drink handed over opens the form.
  await page.goto('/rate?drink=Negroni');
  await expect(page.getByRole('heading', { name: ratePage.heading })).toBeVisible();
  await page.getByRole('group', { name: pour.whereLabel }).getByRole('button', { name: pour.atHome }).click();
  await page.getByRole('radio', { name: /^7:/ }).click();
  await page.getByRole('button', { name: pour.submit }).click();
  await page.getByRole('button', { name: moved.back }).click();

  // Rated: back on the ledger, and the pour survives a reload.
  await expect(page).toHaveURL(/\/log$/);
  await expect(page.getByRole('heading', { name: ratePage.heading })).toHaveCount(0);
  await page.reload();
  await expect(page.locator('ol').filter({ hasText: '7 of 9' })).toContainText('Negroni');

});

test('Log: the map is yours — your menu filled in, or your pours', async ({ page }) => {
  await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.goto('/log');

  await expect(page.getByRole('region', { name: 'The chart' })).toBeVisible();
  const lenses = page.getByRole('group', { name: 'Show' });
  await expect(lenses.getByRole('button')).toHaveText(['Drinks', 'Your pours']);
  await lenses.getByRole('button', { name: 'Your pours' }).click();
  await expect(lenses.getByRole('button', { name: 'Your pours' })).toHaveAttribute('aria-pressed', 'true');

  // With no Menu on the app pages, the reading pages are at its foot.
  const reading = page.getByRole('navigation', { name: logPage.readingLabel });
  await expect(reading.getByRole('link', { name: 'Drinks' })).toHaveAttribute('href', '/drinks');
});

test('Pick a drink: from Log it opens Compass on a menu with no bar', async ({ page }) => {
  await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/log');
  await page.getByRole('link', { name: appBar.pick, exact: true }).click();
  await expect(page).toHaveURL(/\/compass\?menu=1/);
  await expect(page.getByLabel(compass.atMenu.addLabel)).toBeVisible();
  await expect(page.getByLabel(compass.atMenu.barLabel)).toBeVisible();
});

test('Log: the chart sits beside the ledger on a wide screen, above it on a phone', async ({ page }) => {
  await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  const map = page.getByRole('region', { name: chart.label });
  const ledger = page.getByRole('heading', { name: logPage.ledgerTitle, exact: true });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/log');
  await expect(ledger).toBeVisible();
  const [m, l] = [(await map.boundingBox())!, (await ledger.boundingBox())!];
  expect(m.x + m.width).toBeLessThan(l.x);
  expect(l.y).toBeLessThan(m.y + m.height);

  await page.setViewportSize({ width: 390, height: 844 });
  const [m2, l2] = [(await map.boundingBox())!, (await ledger.boundingBox())!];
  expect(m2.y + m2.height).toBeLessThan(l2.y);
});

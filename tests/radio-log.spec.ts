import { test, expect } from '@playwright/test';
import { appBar, chart, logPage, moved, pour, radio, ratePage } from '../src/lib/copy';

const profile = { x: 4, y: -2, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false, vibeTags: {} };

test('App bar: Radio · Compass · Log, and picking a drink is a button, not a tab', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/radio');
  const bar = page.getByRole('navigation', { name: appBar.label });
  await expect(bar.getByRole('link')).toHaveText([appBar.radio, appBar.compass, appBar.log]);
  await expect(bar.getByRole('link', { name: appBar.radio })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('link', { name: appBar.pick, exact: true })).toHaveAttribute('href', '/harbour');

  // The app bar is a phone's navigation here: no Menu repeating it in the header.
  await expect(page.locator('header summary')).toBeHidden();

  // Not on the harbour itself.
  await page.goto('/harbour');
  await expect(page.getByRole('link', { name: appBar.pick, exact: true })).toHaveCount(0);
});

test('Radio: a guest with nothing logged is told how to put something on the air', async ({ page }) => {
  await page.goto('/radio');
  await expect(page.getByText(radio.empty)).toBeVisible();
  await expect(page.getByRole('link', { name: appBar.pick })).toHaveAttribute('href', '/harbour');

  // Following is on the dial, and says it is Later rather than standing empty.
  await page.getByRole('group', { name: radio.filterLabel }).getByRole('button', { name: 'Following' }).click();
  await expect(page.getByText(radio.followingLater)).toBeVisible();
});

test('Log: a guest’s pour is kept on the device, in Log and on Radio', async ({ page }) => {
  await page.addInitScript((p) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('user_profile', JSON.stringify(p));
      sessionStorage.setItem('seeded', '1');
    }
  }, profile);

  // Log shows the log, not a form: rating is a screen of its own.
  await page.goto('/log');
  await expect(page.getByRole('heading', { name: logPage.heading, level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: ratePage.title })).toHaveCount(0);
  await expect(page.getByRole('link', { name: logPage.rateDrink })).toHaveAttribute('href', '/rate');

  // A drink handed over opens the form.
  await page.goto('/rate?drink=Negroni');
  await expect(page.getByRole('heading', { name: ratePage.title })).toBeVisible();
  await page.getByRole('group', { name: pour.whereLabel }).getByRole('button', { name: pour.atHome }).click();
  await page.getByRole('radio', { name: /^7:/ }).click();
  await page.getByRole('button', { name: pour.submit }).click();
  await page.getByRole('button', { name: moved.back }).click();

  // Rated: back on the ledger, and the pour survives a reload.
  await expect(page).toHaveURL(/\/log$/);
  await expect(page.getByRole('heading', { name: ratePage.title })).toHaveCount(0);
  await page.reload();
  await expect(page.locator('ol').filter({ hasText: '7 of 9' })).toContainText('Negroni');

  await page.goto('/radio');
  const today = page.getByRole('region', { name: radio.today });
  await expect(today).toContainText('Negroni');
  await expect(today).toContainText(radio.onDevice);
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

test('Harbour: from a bar on Compass, it starts at that bar’s menu', async ({ page }) => {
  await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.goto('/harbour?bar=Attaboy');
  await expect(page.getByRole('heading', { name: 'What’s on the menu?' })).toBeVisible();
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

test('Radio: the dial sits beside the log on a wide screen, above it on a phone', async ({ page }) => {
  const dial = page.getByRole('group', { name: radio.filterLabel });
  const air = page.getByText(radio.empty);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/radio');
  await expect(page.getByRole('heading', { level: 1, name: radio.heading })).toBeVisible();
  await expect(air).toBeVisible();
  const [d, a] = [(await dial.boundingBox())!, (await air.boundingBox())!];
  expect(a.x + a.width).toBeLessThan(d.x);

  await page.setViewportSize({ width: 390, height: 844 });
  const [d2, a2] = [(await dial.boundingBox())!, (await air.boundingBox())!];
  expect(d2.y + d2.height).toBeLessThan(a2.y);
});

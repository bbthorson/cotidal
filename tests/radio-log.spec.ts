import { test, expect } from '@playwright/test';
import { appBar, logPage, pour, radio, returnVisit } from '../src/lib/copy';

const profile = { x: 4, y: -2, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false, vibeTags: {} };

test('App bar: Radio · Compass · Log, and picking a drink is a button, not a tab', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/radio');
  const bar = page.getByRole('navigation', { name: appBar.label });
  await expect(bar.getByRole('link')).toHaveText([appBar.radio, appBar.compass, appBar.log]);
  await expect(bar.getByRole('link', { name: appBar.radio })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('link', { name: appBar.pick, exact: true })).toHaveAttribute('href', '/harbour');

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

  // Without a drink to rate, Log shows the log, not a form.
  await page.goto('/log');
  await expect(page.getByRole('heading', { name: logPage.title, level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: returnVisit.logTitle })).toHaveCount(0);

  // A drink handed over opens the form.
  await page.goto('/log?drink=Negroni');
  await expect(page.getByRole('heading', { name: returnVisit.logTitle })).toBeVisible();
  await page.getByRole('group', { name: pour.whereLabel }).getByRole('button', { name: pour.atHome }).click();
  await page.getByRole('radio', { name: /^7:/ }).click();
  await page.getByRole('button', { name: pour.submit }).click();
  await page.getByRole('button', { name: returnVisit.movedBack }).click();

  // Rated: the form is closed, and the pour survives a reload.
  await expect(page.getByRole('heading', { name: returnVisit.logTitle })).toHaveCount(0);
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
});

test('Harbour: from a bar on Compass, it starts at that bar’s menu', async ({ page }) => {
  await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
  await page.goto('/harbour?bar=Attaboy');
  await expect(page.getByRole('heading', { name: 'What’s on the menu?' })).toBeVisible();
});

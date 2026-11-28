import { test, expect } from '@playwright/test';
import { appPath } from './app-path';
import { coldState, mapPage, moved, pour, ratePage, taste } from '../src/lib/copy';

test('Your map: server-renders the route shell', async ({ page }) => {
  const response = await page.request.get(appPath);
  expect(response.status()).toBe(200);

  const html = await response.text();
  expect(html).toContain(coldState.title);
  expect(html).toContain('aria-label="Main navigation"');
  expect(html).toContain('href="/"');
});

test('Rate: a guest logs a pour, sees the coordinate move, then the ledger', async ({ page }) => {
  await page.goto(appPath);

  // The cold state says what the page is, and the ways in.
  await expect(page.getByText(coldState.title)).toBeVisible();
  await expect(page.getByText(coldState.body)).toBeVisible();
  await page.getByRole('button', { name: coldState.guestCta }).click();

  // Trying a pour as a guest opens rating in the map's card: the one pour form.
  await expect(page).toHaveURL(/\/(\?q=)?$/);
  const sheet = page.getByRole('region', { name: ratePage.title });
  await expect(sheet.getByRole('heading', { name: ratePage.heading })).toBeVisible();

  const where = page.getByRole('group', { name: pour.whereLabel });
  await where.getByRole('button', { name: pour.atHome }).click();
  await expect(where.getByRole('button', { name: pour.atHome })).toHaveAttribute('aria-pressed', 'true');

  // The 9-point scale is what the pour record stores.
  await page.getByRole('radio', { name: /^8:/ }).click();
  await page.getByRole('button', { name: 'Too sweet', exact: true }).click();
  // A note is chosen by its label and stored by its id (CATA in records.ts).
  await page.getByRole('button', { name: pour.cata['bright-citrus'], exact: true }).click();
  await page.getByRole('button', { name: pour.submit }).click();

  // The after-a-pour screen: where it went, and what it did to the menu.
  await expect(page.getByRole('heading', { name: /^Moved \d/ })).toBeVisible();
  await expect(sheet.getByText(/8 of 9/)).toBeVisible();
  await expect(sheet.getByText(/^Now No\. \d on your menu$|^Not on your menu$/)).toBeVisible();
  await page.getByRole('button', { name: moved.back }).click();
  await expect(sheet).toHaveCount(0);

  // Back to where to next: your taste in words, then Your pours opens the ledger.
  await expect(page).toHaveURL(/\/(\?q=)?$/);
  await expect(page.getByText(taste.label)).toBeVisible();
  await page.getByTestId('open-your-pours').click();
  await expect(page.getByRole('heading', { name: mapPage.ledgerTitle, exact: true })).toBeVisible();
  const ledger = page.locator('ol').filter({ hasText: 'Too sweet' });
  await expect(ledger).toContainText(pour.home);
  await expect(ledger).toContainText('8 of 9');
  // …and shown by its label again, never the id.
  await expect(ledger).toContainText(pour.cata['bright-citrus']);
  await expect(ledger).not.toContainText('bright-citrus');
});

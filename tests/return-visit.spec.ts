import { test, expect } from '@playwright/test';
import { coldState, logPage, menu, moved, pour, ratePage } from '../src/lib/copy';

test('Log: server-renders the route shell', async ({ page }) => {
  const response = await page.request.get('/log');
  expect(response.status()).toBe(200);

  const html = await response.text();
  expect(html).toContain(coldState.title);
  expect(html).toContain('aria-label="Main navigation"');
  expect(html).toContain('href="/log"');
});

test('Rate: a guest logs a pour, sees the coordinate move, then the ledger', async ({ page }) => {
  await page.goto('/log');

  // The cold state says what the page is, and the ways in.
  await expect(page.getByText(coldState.title)).toBeVisible();
  await expect(page.getByText(coldState.body)).toBeVisible();
  await page.getByRole('button', { name: coldState.guestCta }).click();

  // Trying a pour as a guest opens the rating screen: the one pour form.
  await expect(page).toHaveURL(/\/rate$/);
  await expect(page.getByRole('heading', { name: ratePage.heading })).toBeVisible();

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
  await expect(page.getByRole('heading', { name: moved.title })).toBeVisible();
  await expect(page.getByText(/8 of 9/)).toBeVisible();
  await expect(page.getByText(/^Now No\. \d on your menu$|^Not on your menu$/)).toBeVisible();
  await page.getByRole('button', { name: moved.back }).click();

  // Back on Log: where you are now, and the pour in the ledger.
  await expect(page).toHaveURL(/\/log$/);
  await expect(page.getByText(menu.youAreIn)).toBeVisible();
  await expect(page.getByRole('heading', { name: logPage.ledgerTitle, exact: true })).toBeVisible();
  const ledger = page.locator('ol').filter({ hasText: 'Too sweet' });
  await expect(ledger).toContainText(pour.home);
  await expect(ledger).toContainText('8 of 9');
  // …and shown by its label again, never the id.
  await expect(ledger).toContainText(pour.cata['bright-citrus']);
  await expect(ledger).not.toContainText('bright-citrus');
});

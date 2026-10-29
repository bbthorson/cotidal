import { test, expect } from '@playwright/test';
import { returnVisit, pour } from '../src/lib/copy';

test('Return Visit: server-renders /log route shell', async ({ page }) => {
  const response = await page.request.get('/log');
  expect(response.status()).toBe(200);

  const html = await response.text();
  expect(html).toContain(returnVisit.coldTitle);
  expect(html).toContain('aria-label="Main Navigation"');
  expect(html).toContain('href="/log"');
});

test('Return Visit: a guest logs a pour, sees the coordinate move, then the ledger', async ({ page }) => {
  await page.goto('/log');

  // The cold state says what the page is, and the ways in.
  await expect(page.getByText(returnVisit.coldTitle)).toBeVisible();
  await expect(page.getByText(returnVisit.coldBody)).toBeVisible();
  await page.getByRole('button', { name: returnVisit.guestCta }).click();

  // The working surface: where you are, and the one pour form.
  await expect(page.getByRole('heading', { name: returnVisit.logTitle })).toBeVisible();
  await expect(page.getByText(returnVisit.youAreIn)).toBeVisible();

  const where = page.getByRole('group', { name: pour.whereLabel });
  await where.getByRole('button', { name: pour.atHome }).click();
  await expect(where.getByRole('button', { name: pour.atHome })).toHaveAttribute('aria-pressed', 'true');

  // The 9-point scale is what the pour record stores.
  await page.getByRole('radio', { name: /^8:/ }).click();
  await page.getByRole('button', { name: 'Too sweet', exact: true }).click();
  // A note is chosen by its label and stored by its id (CATA in records.ts).
  await page.getByRole('button', { name: pour.cata['bright-citrus'], exact: true }).click();
  await page.getByRole('button', { name: pour.submit }).click();

  // The same after-a-pour screen as /taste.
  await expect(page.getByRole('heading', { name: 'Your coordinate moved.' })).toBeVisible();
  await expect(page.getByText(/8 of 9/)).toBeVisible();
  await page.getByRole('button', { name: returnVisit.movedBack }).click();

  await expect(page.getByRole('heading', { name: returnVisit.ledgerTitle, exact: true })).toBeVisible();
  const ledger = page.locator('ol').filter({ hasText: 'Too sweet' });
  await expect(ledger).toContainText(pour.home);
  await expect(ledger).toContainText('8 of 9');
  // …and shown by its label again, never the id.
  await expect(ledger).toContainText(pour.cata['bright-citrus']);
  await expect(ledger).not.toContainText('bright-citrus');
});

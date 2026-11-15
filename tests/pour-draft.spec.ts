import { test, expect } from '@playwright/test';
import { draftPath } from '../src/lib/pour-draft';
import { coldState, logPage, moved, pour, ratePage } from '../src/lib/copy';

/**
 * A pour drafted in a chat (`draft_pour` on /mcp) and confirmed in the form at
 * the rating sheet that opens over /log. The draft is a link and nothing else: these tests hold what it may
 * carry, and that the form will not log it until the rating is tapped.
 */

test('Draft link: the sheet opens on it, will not log without a rating, and logs once', async ({ page }) => {
  const path = draftPath({ drink: 'Negroni', bar: 'Dante', deviations: ['too-bitter'], note: 'Big orange peel' });
  expect(new URL(path, 'http://x').pathname).toBe('/log');
  await page.goto(path);
  const sheet = page.getByRole('dialog', { name: ratePage.title });
  await sheet.getByRole('button', { name: coldState.guestCta }).click();

  await expect(page.getByTestId('pour-draft-note')).toHaveText(pour.draftNote);
  await expect(page.getByLabel(pour.drinkLabel)).toHaveValue('Negroni');
  await expect(page.getByLabel(pour.barLabel)).toHaveValue('Dante');
  await expect(page.getByRole('button', { name: pour.deviations['too-bitter'], exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(page.getByLabel(pour.noteLabel)).toHaveValue('Big orange peel');

  // No rating chosen, and none can be logged without one.
  await expect(page.getByText(pour.tapRating, { exact: true })).toBeVisible();
  for (const radio of await page.getByRole('radio').all()) await expect(radio).toHaveAttribute('aria-checked', 'false');
  await page.getByRole('button', { name: pour.submit }).click();
  await expect(page.getByText(pour.needRating)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your coordinate moved.' })).toHaveCount(0);

  await page.getByRole('radio', { name: /^6:/ }).click();
  await page.getByRole('button', { name: pour.submit }).click();
  await expect(page.getByRole('heading', { name: 'Your coordinate moved.' })).toBeVisible();
  await expect(sheet.getByText(/6 of 9/)).toBeVisible();

  // Logged once: gone from the URL, and the form is not offered again.
  expect(new URL(page.url()).search).toBe('');
  await page.getByRole('button', { name: moved.back }).click();
  await expect(sheet).toHaveCount(0);
  await expect(page).toHaveURL(/\/log$/);
  await expect(page.getByTestId('pour-draft-note')).toHaveCount(0);
  await expect(page.getByLabel(pour.noteLabel)).toHaveCount(0);
  await expect(page.locator('ol').filter({ hasText: 'Dante' })).toHaveCount(1);
});

test('Draft link: closing the sheet logs nothing and clears the address, other queries stay', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'user_profile',
      JSON.stringify({ x: 4, y: -2, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false, vibeTags: {} })
    );
  });
  await page.goto(`${draftPath({ drink: 'Negroni', bar: 'Dante' })}&utm=chat`);
  const sheet = page.getByRole('dialog', { name: ratePage.title });
  await expect(sheet.getByLabel(pour.drinkLabel)).toHaveValue('Negroni');
  // A tap on the scrim does not throw away what was typed; Escape and Close do close it.
  await page.mouse.click(2, 2);
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: ratePage.close }).click();
  await expect(sheet).toHaveCount(0);
  expect(new URL(page.url()).search).toBe('?utm=chat');
  expect(await page.evaluate(() => localStorage.getItem('guest_pours'))).toBeNull();

  // A reload does not offer it again.
  await page.reload();
  await expect(page.getByRole('heading', { name: logPage.heading })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

import { test, expect } from '@playwright/test';
import { quadrants, returnVisit } from '../src/lib/copy';

/**
 * Questionnaire flow contract:
 * The app opens directly with structured calibration questions and visible
 * selectable options (no conversational chat input).
 *
 * The mathematical scoring underneath is covered directly in `belief-state.spec.ts`.
 */

test('Questionnaire: opens directly with calibration question and selectable options', async ({ page }) => {
  await page.goto('/taste');

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Which glass do you push away first?');
  await expect(page.getByText('Sharp Citrus & Mineral')).toBeVisible();
  await expect(page.getByText('Dense Velvet & Demerara')).toBeVisible();
  await expect(page.getByRole('button', { name: /skip/i })).toBeVisible();
  // The count is honest about the selector being adaptive.
  await expect(page.getByText(/of about 8/)).toBeVisible();
});

test('Questionnaire: browsing skips straight to the map', async ({ page }) => {
  await page.goto('/taste?browse=1');
  await expect(page.getByText('Which glass do you push away first?')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /start over/i })).toBeVisible();
});

test('Questionnaire: answering options advances questions and supports undo', async ({ page }) => {
  await page.goto('/taste');

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Which glass do you push away first?');
  await page.getByText('Sharp Citrus & Mineral').click();

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Which botanical profile do you eliminate?');
  await expect(page.getByRole('button', { name: /previous question/i })).toBeVisible();

  // Test back navigation
  await page.getByRole('button', { name: /previous question/i }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Which glass do you push away first?');
});

test('Questionnaire: finishing the questions reveals a region before the menu', async ({ page }) => {
  await page.goto('/taste');

  // The selector is adaptive, so the path is not fixed: take the first plate
  // until the reveal appears. It ends within eight questions.
  const reveal = page.getByText('Your coordinate lands in');
  for (let i = 0; i < 10 && !(await reveal.isVisible()); i++) {
    const heading = await page.getByRole('heading', { level: 1 }).textContent();
    await page.getByRole('group', { name: 'Answer options' }).getByRole('button').first().click();
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(heading ?? '');
  }

  await expect(reveal).toBeVisible();
  const names = quadrants.map((q) => q.name.replace(/^The /, '')).join('|');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(new RegExp(`^The (${names})\\.$`));
  await page.getByRole('button', { name: /see what to order/i }).click();

  await expect(page.getByText('You are in')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Your coordinate' })).toBeVisible();
});

test('Menu: one ranked list, with no occasion switch', async ({ page }) => {
  await page.goto('/taste?browse=1');

  await expect(page.getByText(/No\. 1 · Your go-to/)).toBeVisible();
  // The occasion tabs are gone; the menu ranks by closeness alone.
  await expect(page.getByRole('group', { name: 'Occasion' })).toHaveCount(0);
  for (const label of ['Usual', 'Night out', 'Impress', 'Holiday']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(0);
  }

  // Top pick plus the numbered rest, scored from highest to lowest.
  const scores = await page.getByLabel(/^Closeness \d+$/).evaluateAll((els) =>
    els.map((el) => Number(el.textContent))
  );
  expect(scores.length).toBeGreaterThan(1);
  expect(scores).toEqual([...scores].sort((a, b) => b - a));

  // Menu · Map. Logging a pour is /log, in the header — not a third tab.
  const tabs = page.getByRole('navigation', { name: 'Your coordinate' });
  await expect(tabs.getByRole('button')).toHaveText(['Menu', 'Map']);
});

test('Map: tap a drink, then "Log this" opens /log on that drink', async ({ page }) => {
  await page.goto('/taste?browse=1');
  await page.getByRole('navigation', { name: 'Your coordinate' }).getByRole('button', { name: 'Map' }).click();

  const lenses = page.getByRole('group', { name: 'Show' });
  await expect(lenses.getByRole('button')).toHaveText(['Everything', 'Your menu', 'Your pours']);

  // The list under the map reaches every drink at full size; pick its first.
  await expect(page.getByRole('heading', { name: 'Nearest to you' })).toBeVisible();
  const first = page.getByRole('heading', { name: 'Nearest to you' }).locator('xpath=..').getByRole('listitem').first();
  const drink = (await first.locator('.font-serif').textContent())!.trim();
  await first.getByRole('button').click();
  await expect(page.getByText('Closeness')).toBeVisible();

  // Your pours lens says plainly when there is nothing yet.
  await lenses.getByRole('button', { name: 'Your pours' }).click();
  await expect(page.getByText('Nothing poured yet.', { exact: false })).toBeVisible();
  await lenses.getByRole('button', { name: 'Everything' }).click();
  await first.getByRole('button').click();

  await page.getByRole('button', { name: 'Log this' }).click();
  await expect(page).toHaveURL(/\/log\?drink=/);
  // A guest with no coordinate starts from the cold state; the drink waits.
  const asGuest = page.getByRole('button', { name: returnVisit.guestCta });
  const form = page.getByRole('heading', { name: returnVisit.logTitle });
  await expect(asGuest.or(form)).toBeVisible();
  if (await asGuest.isVisible()) await asGuest.click();
  await expect(form).toBeVisible();
  await expect(page.getByLabel('What you’re drinking')).toHaveValue(new RegExp(drink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 6)));
});

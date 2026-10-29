import { test, expect } from '@playwright/test';
import { quadrants, returnVisit, compass } from '../src/lib/copy';

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

test('Questionnaire: browsing skips straight to Compass', async ({ page }) => {
  await page.goto('/taste?browse=1');
  await expect(page.getByText('Which glass do you push away first?')).toHaveCount(0);
  await expect(page.getByRole('button', { name: compass.findYours })).toBeVisible();
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

  // After the reveal, Compass: your menu, and a search over drinks and bars.
  await expect(page.getByText(/No\. 1 · Your go-to/)).toBeVisible();
  await expect(page.getByRole('searchbox', { name: compass.searchLabel })).toBeVisible();
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

  // Compass points outward; the map is Log's.
  await expect(page.getByRole('region', { name: 'The chart' })).toHaveCount(0);
});

test('Compass: search a drink, tap it, then "Log this" opens /log on that drink', async ({ page }) => {
  await page.goto('/taste?browse=1');

  // A drink is found by what is in it, not only by its name.
  await page.getByRole('searchbox', { name: compass.searchLabel }).fill('mezcal');
  const first = page.locator('ol > li').first();
  await expect(first).toBeVisible();
  const drink = (await first.locator('.font-serif').textContent())!.trim();

  // A typed bar the log has never seen still opens the harbour there.
  await expect(page.getByRole('link', { name: new RegExp(compass.pickAt('mezcal')) })).toHaveAttribute(
    'href',
    '/harbour?bar=mezcal'
  );

  await first.getByRole('button').click();
  await expect(page.getByText('Closeness', { exact: true })).toBeVisible();

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

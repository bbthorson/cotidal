import { test, expect } from '@playwright/test';
import { quadrants } from '../src/lib/copy';

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

test('Menu: one list, with the four occasions switched in one place', async ({ page }) => {
  await page.goto('/taste?browse=1');

  const occasions = page.getByRole('group', { name: 'Occasion' });
  await expect(occasions.getByRole('button')).toHaveCount(4);
  await expect(occasions.getByRole('button', { name: 'Usual' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/No\. 1 · Your go-to/)).toBeVisible();

  await occasions.getByRole('button', { name: 'Impress' }).click();
  await expect(page.getByText(/No\. 1 · Making an impression/)).toBeVisible();

  // Menu · Map · Log a pour — the Palate and Oracle tabs are gone.
  const tabs = page.getByRole('navigation', { name: 'Your coordinate' });
  await expect(tabs.getByRole('button')).toHaveText(['Menu', 'Map', 'Log a pour']);
});

test('Map: tap a drink, then "Log this" opens the form on that drink', async ({ page }) => {
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

  await page.getByRole('button', { name: 'Log this' }).click();
  await expect(page.getByRole('heading', { name: 'Log a pour' })).toBeVisible();
  await expect(page.getByLabel('What you’re drinking')).toHaveValue(new RegExp(drink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 6)));

  // Your pours lens says plainly when there is nothing yet.
  await page.getByRole('navigation', { name: 'Your coordinate' }).getByRole('button', { name: 'Map' }).click();
  await lenses.getByRole('button', { name: 'Your pours' }).click();
  await expect(page.getByText('Nothing poured yet.', { exact: false })).toBeVisible();
});

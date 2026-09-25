import { test, expect } from '@playwright/test';

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
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^The (Ember|Salt Line|Vault|Orchard)\.$/);
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

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

  await expect(page.getByRole('heading', { level: 1 })).toContainText('How do you take your coffee?');
  await expect(page.getByText('Black or Espresso.')).toBeVisible();
  await expect(page.getByText('With milk and sugar.')).toBeVisible();
  await expect(page.getByRole('button', { name: /skip to map/i })).toBeVisible();
});

test('Questionnaire: browsing skips straight to the map', async ({ page }) => {
  await page.goto('/taste?browse=1');
  await expect(page.getByText('How do you take your coffee?')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /start over/i })).toBeVisible();
});

test('Questionnaire: answering options advances questions and supports undo', async ({ page }) => {
  await page.goto('/taste');

  await expect(page.getByRole('heading', { level: 1 })).toContainText('How do you take your coffee?');
  await page.getByText('Black or Espresso.').click();

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Pick a finish to a perfect meal.');
  await expect(page.getByRole('button', { name: /previous question/i })).toBeVisible();

  // Test back navigation
  await page.getByRole('button', { name: /previous question/i }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('How do you take your coffee?');
});

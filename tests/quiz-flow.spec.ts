import { test, expect } from '@playwright/test';
import { questions } from '../src/lib/discovery-questions';
import { quadrants, chart, compass, explore, reveal as revealCopy } from '../src/lib/copy';

/**
 * Questionnaire flow contract:
 * The questions page opens directly with structured calibration questions
 * and visible selectable options (no conversational chat input).
 *
 * The mathematical scoring underneath is covered directly in `belief-state.spec.ts`.
 */

// The four openers are fixed (CALIBRATION_IDS); their words are not this file's to know.
const opener = (id: string) => questions.find((q) => q.id === id)!;
const first = opener('triad_sugar_texture');
const second = opener('triad_bitter_botanical');

test('Questionnaire: opens directly with calibration question and selectable options', async ({ page }) => {
  await page.goto('/questions');

  await expect(page.getByRole('heading', { level: 1 })).toContainText(first.text);
  for (const option of first.options) await expect(page.getByText(option.text, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /skip/i })).toBeVisible();
  // The count is honest about the selector being adaptive.
  await expect(page.getByText(/of about 8/)).toBeVisible();
});

test('Questionnaire: skipping goes to the map', async ({ page }) => {
  await page.goto('/questions');
  await page.getByRole('button', { name: /skip/i }).click();
  await expect(page).toHaveURL(/\/map$/);
});

test('Questionnaire: someone who already has a coordinate is sent on to the map', async ({ page }) => {
  await page.goto('/map');
  await page.evaluate(
    (p) => localStorage.setItem('user_profile', JSON.stringify(p)),
    { x: 4, y: -2, vibeTags: {}, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false }
  );
  await page.goto('/questions');
  await expect(page).toHaveURL(/\/map$/);
});

test('Questionnaire: answering options advances questions and supports undo', async ({ page }) => {
  await page.goto('/questions');

  await expect(page.getByRole('heading', { level: 1 })).toContainText(first.text);
  await page.getByText(first.options[0].text, { exact: true }).click();

  await expect(page.getByRole('heading', { level: 1 })).toContainText(second.text);
  await expect(page.getByRole('button', { name: /previous question/i })).toBeVisible();

  // Test back navigation
  await page.getByRole('button', { name: /previous question/i }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(first.text);
});

test('Questionnaire: finishing the questions reveals a region before the menu', async ({ page }) => {
  await page.goto('/questions');

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
  await page.getByRole('button', { name: revealCopy.continue }).click();
  await expect(page).toHaveURL(/\/map$/);

  // After the reveal, the map: your terrain, your menu, and a search over drinks and bars in the header.
  await expect(page.locator(`svg[aria-label="${explore.mapLabel}"]`)).toBeVisible();
  await expect(page.getByRole('heading', { name: compass.menuTitle })).toBeVisible();
  await expect(page.getByRole('searchbox', { name: compass.searchLabel })).toBeVisible();
});

test('Menu: one ranked list, with no occasion switch', async ({ page }) => {
  await page.goto('/map');
  await page.evaluate(
    (p) => localStorage.setItem('user_profile', JSON.stringify(p)),
    { x: 4, y: -2, vibeTags: {}, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false }
  );
  await page.reload();

  await expect(page.getByRole('heading', { name: compass.menuTitle })).toBeVisible();
  // The occasion tabs are gone; the menu ranks on your terrain, with taste only sorting drinks that stand level.
  await expect(page.getByRole('group', { name: 'Occasion' })).toHaveCount(0);
  for (const label of ['Usual', 'Night out', 'Impress', 'Holiday']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(0);
  }

  // Each drink says what put it there — with nothing rated, where your answers put you —
  // never a predicted score, and no distance that the order would not follow.
  expect(await page.getByText(chart.reason([]), { exact: true }).count()).toBeGreaterThan(1);
  await expect(page.getByLabel(/ away$/)).toHaveCount(0);

  // The map is drawn behind the card.
  await expect(page.locator(`svg[aria-label="${explore.mapLabel}"]`)).toBeVisible();
});


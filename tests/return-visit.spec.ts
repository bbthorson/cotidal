import { test, expect } from '@playwright/test';
import { returnVisit } from '../src/lib/copy';

test('Return Visit: server-renders /log route shell', async ({ page }) => {
  const response = await page.request.get('/log');
  expect(response.status()).toBe(200);

  const html = await response.text();
  expect(html).toContain('The Return Visit');
  expect(html).toContain('aria-label="Main Navigation"');
  expect(html).toContain('href="/log"');
});

test('Return Visit: cold visitor can test guest pour and observe coordinate shift', async ({ page }) => {
  await page.goto('/log');

  // Verify cold visitor callout
  await expect(page.getByText(returnVisit.coldTitle)).toBeVisible();
  await expect(page.getByText(returnVisit.coldBody)).toBeVisible();

  // Click guest specimen action
  const guestButton = page.getByRole('button', { name: /test a pour as guest/i });
  await expect(guestButton).toBeVisible();
  await guestButton.click();

  // The active palate surface appears
  await expect(page.getByRole('heading', { name: /log a pour/i })).toBeVisible();
  await expect(page.getByText('Your Flavor Position')).toBeVisible();

  // Context: toggle Home Pour
  const homePourToggle = page.getByRole('button', { name: /switch to home pour/i });
  await homePourToggle.click();
  await expect(page.getByText('Home Pour Active')).toBeVisible();

  // Deviations: toggle 'Too sweet'
  const tooSweetBtn = page.getByRole('button', { name: 'Too sweet', exact: true });
  await tooSweetBtn.click();

  // Submit pour
  const submitBtn = page.getByRole('button', { name: /log pour & calibrate map/i });
  await submitBtn.click();

  // Observe shift feedback banner and chronicle
  await expect(page.getByText(/palate shift recorded/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: returnVisit.ledgerTitle, exact: true })).toBeVisible();
  await expect(page.getByText('Home Pour', { exact: true })).toBeVisible();
  await expect(page.getByText('too sweet', { exact: true })).toBeVisible();
});

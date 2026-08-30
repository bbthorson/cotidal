import { test, expect } from '@playwright/test';

test('Verify quiz layout and question progression', async ({ page }) => {
  await page.goto('/taste');

  await page.waitForTimeout(1000);

  // First question should be visible in the prompt zone
  await expect(page.getByText('How do you take your coffee?')).toBeVisible();

  // Click the first option
  await page.getByRole('button', { name: 'Black or Espresso.' }).click();

  // Second question should appear
  await expect(page.getByText('Pick a finish to a perfect meal.')).toBeVisible();

  // Answer question 2
  await page.getByRole('button', { name: 'Lemon Tart' }).click();

  // Third question should appear
  await expect(page.getByText('Do you enjoy the bite of Tonic water?')).toBeVisible();
});

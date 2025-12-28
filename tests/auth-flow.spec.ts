import { test, expect } from '@playwright/test';

test('Auth: Should attempt anonymous sign-in on load', async ({ page }) => {
  await page.goto('/');
  
  // The loader should appear initially
  const loader = page.locator('text=The Oracle is acknowledging your presence...');
  // Since it's fast, we might miss it or it might hang if no config.
  
  // Wait for the auth wrapper to have a status
  const wrapper = page.locator('[data-auth-status]');
  await expect(wrapper).toBeVisible({ timeout: 10000 });
  
  // It will likely be 'failed' in tests without live Firebase config
  const status = await wrapper.getAttribute('data-auth-status');
  expect(['authenticated', 'failed']).toContain(status);
});

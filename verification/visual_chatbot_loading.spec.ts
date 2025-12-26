import { test, expect } from '@playwright/test';

test('Chatbot Loading State Visual Verification', async ({ page }) => {
  // 1. Inject user profile
  await page.goto('http://localhost:9002/');
  await page.evaluate(() => {
    localStorage.setItem('user_profile', JSON.stringify({
      x: 0, y: 0, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false, vibeTags: {}
    }));
  });
  await page.reload();

  // 2. Type in chatbot
  const textarea = page.locator('textarea[name="ingredientsDescription"]');
  await textarea.fill('lemon');

  // 3. Click submit
  await page.getByRole('button', { name: 'Find Recipes' }).click();

  // 4. Wait for loading indicator
  const loadingIndicator = page.getByText(/Mixing up some ideas/i);
  await expect(loadingIndicator).toBeVisible({ timeout: 5000 });

  // 5. Screenshot the loading state
  // We want to capture the loading state before the AI responds (which might be fast or slow)
  // Since we don't control the AI speed, but we know it takes some time, this should catch it.
  await page.screenshot({ path: 'verification/chatbot_loading_state.png', fullPage: true });
});

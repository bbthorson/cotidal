
import { test, expect } from '@playwright/test';

test('Verify ChatInput character count updates', async ({ page }) => {
  // Inject user profile to skip quiz and go to ResultsScreen where Chatbot is
  await page.goto('http://localhost:9002/');

  await page.evaluate(() => {
    localStorage.setItem('user_profile', JSON.stringify({
      x: 0,
      y: 0,
      dislikesSmoke: false,
      dislikesBitter: false,
      dislikesAnise: false,
      vibeTags: {}
    }));
  });

  // Reload to apply profile
  await page.reload();

  // Scroll down to find the Chatbot
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  // Locate the input
  const input = page.locator('textarea[name="ingredientsDescription"]');
  await expect(input).toBeVisible();

  // Verify initial count
  await expect(page.getByText('0/500')).toBeVisible();

  // Type something
  await input.fill('Gin and Tonic');

  // Verify count update
  await expect(page.getByText('13/500')).toBeVisible();

  // Take screenshot
  await page.screenshot({ path: 'verification/chat_input.png' });
});

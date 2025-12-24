import { test, expect } from '@playwright/test';

test('Chatbot UX verification', async ({ page }) => {
  // 1. Inject user profile to skip quiz
  await page.goto('http://localhost:9002');
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
  await page.reload();

  // 2. Wait for Results Screen and Chatbot
  await expect(page.locator('h1', { hasText: 'The Palate Map' })).toBeVisible();

  // 3. Check Chatbot Heading (h2)
  const chatbotHeading = page.locator('h2', { hasText: 'Drink Discovery Chat' });
  await expect(chatbotHeading).toBeVisible();

  // 4. Check Character Counter
  const textarea = page.locator('textarea[name="ingredientsDescription"]');
  const counter = page.locator('text=/500'); // Simple text locator

  await expect(counter).toHaveText('0/500');

  // 5. Type and check counter update
  await textarea.fill('Hello world');
  await expect(counter).toHaveText('11/500');

  // 6. Test Max Length
  const longText = 'a'.repeat(510);
  await textarea.fill(longText);

  // Playwright's fill sends input events but truncates based on maxLength if respected by browser
  // Let's force it to try to type more or check value

  const value = await textarea.inputValue();
  expect(value.length).toBe(500);
  await expect(counter).toHaveText('500/500');

  // 7. Screenshot
  await page.screenshot({ path: 'verification/chatbot_ux.png', fullPage: true });
});

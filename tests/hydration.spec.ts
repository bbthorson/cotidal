import { test, expect } from '@playwright/test';

// The server cannot see the device, so an island's first render must not read
// it: a palate on the device used to make the browser draw a different page
// from the server's, and React discarded the server's (error #418).
const profile = { x: 4, y: -2, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false, vibeTags: {} };
const pages = ['/compass', '/log', '/harbour', '/rate', '/rate?drink=Lambrusco'];

for (const path of pages) {
  test(`Hydration: ${path} with a palate on the device draws what the server drew`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript((p) => localStorage.setItem('user_profile', JSON.stringify(p)), profile);
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });
}

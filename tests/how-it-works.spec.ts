import { test, expect } from '@playwright/test';
import { howItWorks } from '../src/lib/copy';

/**
 * /how-it-works explains, in public, how answers and ratings move a
 * coordinate. A page like that is only worth having if it is true, so its
 * numbers are held to the code's here: change a constant and this fails
 * until the copy says the new thing.
 */

test('How it works: a public page, no script, none of the code’s words', async ({ page }) => {
  const scripts: string[] = [];
  page.on('response', (res) => {
    if (res.request().resourceType() === 'script' && res.url().includes('/_astro/')) scripts.push(res.url());
  });
  await page.goto('/how-it-works', { waitUntil: 'networkidle' });

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(howItWorks.title);
  for (const section of howItWorks.sections) {
    await expect(page.getByRole('heading', { level: 2, name: section.title })).toBeVisible();
  }
  expect(scripts).toHaveLength(0);
  expect(await page.locator('astro-island').count()).toBe(0);

  // docs/brand.md, Vocabulary: internal names stay internal.
  const body = (await page.locator('main').innerText()).toLowerCase();
  for (const word of ['calibrat', 'latent', 'triangulat', 'kalman', 'posterior', 'verified', 'forever']) {
    expect(body, word).not.toContain(word);
  }
});

test('How it works: read from the footer and from the landing page', async ({ request }) => {
  const html = await (await request.get('/')).text();
  const footer = html.slice(html.lastIndexOf('<footer'), html.lastIndexOf('</footer>'));
  expect(footer).toContain('href="/how-it-works"');
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  expect(main).toContain('href="/how-it-works"');
});

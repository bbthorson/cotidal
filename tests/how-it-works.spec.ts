import { test, expect } from '@playwright/test';
import { hero, howItWorks, nav } from '../src/lib/copy';

/**
 * How it works is the front door's card, pulled up (`/?about=1#how-it-works`): the
 * public account of how answers and ratings move a coordinate, never a page
 * of its own. A page like that is only worth having if it is true, so its
 * numbers are held to the code's in tests/unit/how-it-works.test.ts.
 */

test('How it works: in full on the front door, with no script and none of the code’s words', async ({ page }) => {
  const scripts: string[] = [];
  page.on('response', (res) => {
    if (res.request().resourceType() === 'script' && res.url().includes('/_astro/')) scripts.push(res.url());
  });
  await page.goto('/?about=1#how-it-works', { waitUntil: 'networkidle' });

  const account = page.getByTestId('how-it-works');
  await expect(account.getByRole('heading', { level: 2, name: hero.howTitle })).toBeVisible();
  for (const section of howItWorks.sections) {
    await expect(account.getByRole('heading', { level: 3, name: section.title })).toBeAttached();
    for (const p of section.paragraphs) await expect(account.getByText(p, { exact: true })).toBeAttached();
  }
  expect(scripts).toHaveLength(0);

  // docs/brand.md, Vocabulary: internal names stay internal.
  const body = (await account.innerText()).toLowerCase();
  for (const word of ['calibrat', 'latent', 'triangulat', 'kalman', 'posterior', 'verified', 'forever']) {
    expect(body, word).not.toContain(word);
  }
});

test('How it works: reached from the footer and the menu, by its anchor; there is no page of its own', async ({ request }) => {
  const html = await (await request.get('/')).text();
  const footer = html.slice(html.lastIndexOf('<footer'), html.lastIndexOf('</footer>'));
  expect(footer).toContain('href="/?about=1#how-it-works"');
  expect(html).toContain(`>${nav.howItWorks}<`);
  expect((await request.get('/how-it-works')).status()).toBe(404);
});

import { test, expect } from '@playwright/test';
import { howItWorks } from '../src/lib/copy';
import { MAX_QUESTIONS, MIN_QUESTIONS } from '../src/lib/belief-state';
import { MAX_POUR_STEP, applyPour, createInitialPalateState, projectTo2D } from '../src/lib/palate-state';
import { drinkDatabase } from '../src/lib/data';

/**
 * /how-it-works explains, in public, how answers and ratings move a
 * coordinate. A page like that is only worth having if it is true, so its
 * numbers are held to the code's here: change a constant and this fails
 * until the copy says the new thing.
 */

const text = (section: string) =>
  howItWorks.sections.find((s) => s.id === section)!.paragraphs.join(' ');

test('How it works: the question counts are the selector’s', () => {
  const questions = text('questions');
  expect(questions).toContain(`The first ${MIN_QUESTIONS} questions are the same for everyone`);
  expect(questions).toContain(`never fewer than ${MIN_QUESTIONS}, never more than ${MAX_QUESTIONS}`);
});

test('How it works: the rating rules are the ones a pour applies', () => {
  const ratings = text('ratings');
  // "a tenth of the way across": the chart is 20 units wide.
  expect(MAX_POUR_STEP / 20).toBe(0.1);
  expect(ratings).toContain('a tenth of the way across the chart');

  // 7 or more pulls, 3 or less pushes, in between stays.
  expect(ratings).toContain('A 7 or higher pulls your point toward that drink, a 3 or lower pushes it away');
  const prior = createInitialPalateState({ x: 0, y: 0 });
  const far = drinkDatabase.find((d) => Math.hypot(d.x, d.y) > 5)!;
  const distanceAfter = (hedonic: number) => {
    const p = projectTo2D(applyPour(prior, far, { hedonic }));
    return Math.hypot(far.x - p.x, far.y - p.y);
  };
  const start = Math.hypot(far.x, far.y);
  expect(distanceAfter(7)).toBeLessThan(start);
  expect(distanceAfter(3)).toBeGreaterThan(start);
  for (const h of [4, 5, 6]) expect(distanceAfter(h), String(h)).toBeCloseTo(start, 9);
});

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

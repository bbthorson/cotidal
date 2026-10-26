import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { drinkDatabase } from '../src/lib/data';
import { INGREDIENT_GROUPS } from '../src/lib/ingredients';
import { quadrantIdFor, QUADRANT_ORDER } from '../src/lib/quadrant';

/**
 * Region prose is held to the drinks' discipline, and checked the same way:
 * as text, because `astro:content` only resolves inside Astro's build.
 */

const REGIONS_DIR = join(process.cwd(), 'src/content/regions');
const DRINKS_DIR = join(process.cwd(), 'src/content/drinks');

const regions = readdirSync(REGIONS_DIR)
  .filter((f) => f.endsWith('.md'))
  .map((file) => {
    const raw = readFileSync(join(REGIONS_DIR, file), 'utf8');
    const body = raw.split(/^---$/m)[2] ?? '';
    return {
      file,
      id: file.replace(/\.md$/, ''),
      documentedCount: (raw.match(/^ {2}- claim:/gm) ?? []).length,
      drinkLinks: [...body.matchAll(/\]\(\/drinks\/([^)#]+)\)/g)].map((m) => m[1]),
    };
  });

/** Drink slug → the region the map places it in. */
const drinkRegion = new Map(
  readdirSync(DRINKS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const raw = readFileSync(join(DRINKS_DIR, file), 'utf8');
      const name = raw.match(/^name: "(.+)"$/m)?.[1];
      const drink = drinkDatabase.find((d) => d.name === name);
      return [file.replace(/\.md$/, ''), drink ? quadrantIdFor(drink.x, drink.y) : null] as const;
    })
);

test('Region content: every entry is named for a region', () => {
  for (const region of regions) {
    expect(QUADRANT_ORDER, `${region.file} is not a region id — the filename is the URL`).toContain(
      region.id
    );
  }
});

test('Region content: all four regions are written', () => {
  // The page renders without an entry — everything but the prose is derived —
  // so a missing one would not break the build. It would only be empty.
  for (const id of QUADRANT_ORDER) {
    expect(regions.map((r) => r.id), `no src/content/regions/${id}.md`).toContain(id);
  }
});

test('Region content: no entry is published without something on the record', () => {
  for (const region of regions) {
    expect(region.documentedCount, `${region.file} has no documented claims`).toBeGreaterThan(0);
  }
});

test('Region content: the drinks a region names are drinks the map puts there', () => {
  // The previous prose filed the Last Word under The Surf and the Old
  // Fashioned under The Eddy; the map had them elsewhere. A linked drink is
  // checked against the map, so prose cannot move one.
  for (const region of regions) {
    for (const slug of region.drinkLinks) {
      expect(drinkRegion.has(slug), `${region.file} links /drinks/${slug}, which has no entry`).toBe(
        true
      );
      expect(
        drinkRegion.get(slug),
        `${region.file} names /drinks/${slug}, which the map places elsewhere`
      ).toBe(region.id);
    }
  }
});

test('Shared ingredients: every group still matches a drink', () => {
  const names = readdirSync(DRINKS_DIR)
    .filter((f) => f.endsWith('.md'))
    .flatMap((file) =>
      [...readFileSync(join(DRINKS_DIR, file), 'utf8').matchAll(/^ {2}- \{.*name: "([^"]+)"/gm)].map(
        (m) => m[1]
      )
    );

  for (const group of INGREDIENT_GROUPS) {
    expect(
      names.some((n) => group.match.test(n)),
      `"${group.name}" matches no ingredient — was one renamed?`
    ).toBe(true);
  }
});

test('Region routes: mount no island', () => {
  const dir = join(process.cwd(), 'src/pages/regions');
  for (const file of readdirSync(dir, { recursive: true, encoding: 'utf8' })) {
    if (!file.endsWith('.astro')) continue;
    const source = readFileSync(join(dir, file), 'utf8');
    expect(source, `${file} mounts an island`).not.toMatch(/client:(load|only|idle|visible|media)/);
  }
});

test('Region pages: ship no client JavaScript', async ({ page }) => {
  for (const id of QUADRANT_ORDER) {
    const scripts: string[] = [];
    const listener = (res: { url(): string; request(): { resourceType(): string } }) => {
      if (res.request().resourceType() === 'script' && res.url().includes('/_astro/')) {
        scripts.push(res.url());
      }
    };
    page.on('response', listener);
    await page.goto(`/regions/${id}`, { waitUntil: 'networkidle' });
    page.off('response', listener);

    expect(scripts, `/regions/${id} loads ${scripts.join(', ')}`).toHaveLength(0);
    expect(await page.locator('astro-island').count(), `/regions/${id} hydrates`).toBe(0);
  }
});

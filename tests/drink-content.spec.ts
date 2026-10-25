import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { drinkDatabase } from '../src/lib/data';
import { quadrantIdFor, QUADRANT_ORDER } from '../src/lib/quadrant';

/**
 * The recurring failure in this codebase is a second, hand-maintained copy of
 * something that drifts from the first, silently. Drink prose introduces one
 * more place for that to happen — content frontmatter — so its join key is
 * checked here rather than trusted.
 *
 * Frontmatter is read as text instead of through `astro:content` because that
 * module only resolves inside Astro's build; this runs anywhere.
 */

/** Playwright runs with the repo root as cwd (the directory holding the config). */
const DRINKS_DIR = join(process.cwd(), 'src/content/drinks');

const entries = readdirSync(DRINKS_DIR)
  .filter((f) => f.endsWith('.md'))
  .map((file) => {
    const raw = readFileSync(join(DRINKS_DIR, file), 'utf8');
    const field = (key: string) => raw.match(new RegExp(`^${key}: "(.+)"$`, 'm'))?.[1];
    return {
      file,
      slug: file.replace(/\.md$/, ''),
      name: field('name'),
      title: field('title'),
      documentedCount: (raw.match(/^ {2}- claim:/gm) ?? []).length,
    };
  });

test('Drink content: every entry exists and names a drink on the map', () => {
  expect(entries.length).toBeGreaterThan(0);

  for (const entry of entries) {
    expect(entry.name, `${entry.file} has no name`).toBeTruthy();
    expect(entry.title, `${entry.file} has no title`).toBeTruthy();

    const drink = drinkDatabase.find((d) => d.name === entry.name);
    expect(
      drink,
      `${entry.file}: name "${entry.name}" is not in drinkDatabase — coordinates ` +
        'come from src/lib/data.ts, so an entry that does not join has no place on the map'
    ).toBeDefined();
  }
});

test('Drink content: no entry is published without something on the record', () => {
  // The schema enforces `documented` is non-empty at build time; this catches
  // it in the suite too, because it is the point of the format.
  for (const entry of entries) {
    expect(entry.documentedCount, `${entry.file} has no documented claims`).toBeGreaterThan(0);
  }
});

test('Drink content: entries cover all four quadrants', () => {
  const covered = new Set(
    entries
      .map((e) => drinkDatabase.find((d) => d.name === e.name))
      .filter((d): d is NonNullable<typeof d> => !!d)
      .map((d) => quadrantIdFor(d.x, d.y))
  );

  for (const quadrant of QUADRANT_ORDER) {
    expect(covered, `no drink written up in the ${quadrant} quadrant`).toContain(quadrant);
  }
});

test('Drink routes: mount no island', () => {
  // `tests/landing-static.spec.ts` guards `/` at runtime. The register is the
  // same kind of route — static prose — and needs the same guard, but checked
  // in the source so it holds without a dev server.
  const dir = join(process.cwd(), 'src/pages/drinks');
  for (const file of readdirSync(dir)) {
    const source = readFileSync(join(dir, file), 'utf8');
    expect(source, `${file} mounts an island`).not.toMatch(/client:(load|only|idle|visible|media)/);
  }
});

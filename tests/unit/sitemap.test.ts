import { describe, expect, test } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildSitemapXml,
  DEFAULT_SITE_ORIGIN,
  DISALLOWED_CRAWL_PATHS,
  STATIC_SITEMAP_PATHS,
} from '../../src/lib/pages/sitemap';

const DRINKS_DIR = join(process.cwd(), 'src/content/drinks');
const ROBOTS_PATH = join(process.cwd(), 'public/robots.txt');

describe('AEO sitemap & robots.txt', () => {
  const drinkSlugs = readdirSync(DRINKS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));

  test('buildSitemapXml includes core public routes and every drink entry', () => {
    const xml = buildSitemapXml(DEFAULT_SITE_ORIGIN, drinkSlugs);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    for (const path of STATIC_SITEMAP_PATHS) {
      expect(xml).toContain(`<loc>${DEFAULT_SITE_ORIGIN}${path}</loc>`);
    }
    for (const slug of drinkSlugs) {
      expect(xml).toContain(`<loc>${DEFAULT_SITE_ORIGIN}/drinks/${slug}</loc>`);
    }
    for (const disallowed of DISALLOWED_CRAWL_PATHS) {
      expect(xml).not.toContain(`<loc>${DEFAULT_SITE_ORIGIN}${disallowed}`);
    }
  });

  test('public/robots.txt advertises sitemap and disallows private paths', () => {
    const robots = readFileSync(ROBOTS_PATH, 'utf8');
    expect(robots).toContain(`Sitemap: ${DEFAULT_SITE_ORIGIN}/sitemap.xml`);
    for (const disallowed of DISALLOWED_CRAWL_PATHS) {
      expect(robots).toContain(`Disallow: ${disallowed}`);
    }
  });
});

import { barsHref, drinkPagePath } from '../site-nav';

/** Canonical production origin when `Astro.site` is not configured. */
export const DEFAULT_SITE_ORIGIN = 'https://cotidal.app';

/** Static public pages included in the sitemap alongside every drink entry. */
export const STATIC_SITEMAP_PATHS = ['/', barsHref, '/mcp'] as const;

/** Paths disallowed for crawlers in `public/robots.txt`. */
export const DISALLOWED_CRAWL_PATHS = ['/api/', '/oauth/', '/settings', '/share/'] as const;

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/**
 * Build a standard XML sitemap for search engines and AI agents
 * (including Cloudflare Search for Agents).
 */
export function buildSitemapXml(origin: string, drinkSlugs: readonly string[]): string {
  const base = origin.replace(/\/+$/, '');
  const paths = [
    ...STATIC_SITEMAP_PATHS,
    ...[...new Set(drinkSlugs)].sort().map((slug) => drinkPagePath(slug)),
  ];

  const urls = paths
    .map((path) => `  <url>\n    <loc>${escapeXml(`${base}${path}`)}</loc>\n  </url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

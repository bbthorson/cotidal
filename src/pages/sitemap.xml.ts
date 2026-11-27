import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { buildSitemapXml, DEFAULT_SITE_ORIGIN } from '../lib/pages/sitemap';

/**
 * Prerendered XML sitemap covering the front door, reading pages, `/mcp`,
 * and every static `/drinks/<slug>` entry so search engines and Cloudflare
 * Search for Agents can discover the register without a `/drinks` index page.
 */
export const prerender = true;

export const GET: APIRoute = async ({ site }) => {
  const entries = await getCollection('drinks');
  const origin = site?.toString() ?? DEFAULT_SITE_ORIGIN;
  const xml = buildSitemapXml(
    origin,
    entries.map((entry) => entry.id)
  );
  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};

import type { APIRoute } from 'astro';
import { readPublicVenue } from '@/lib/atproto/venue-read';

/**
 * Public read endpoint for a claimed bar's live AT Protocol venue & menu.
 * Used by the map (`/map?venue=<handle>`) to preload a bar's published
 * menu directly into `MenuView` and rank it for the drinker's coordinate.
 */
export const GET: APIRoute = async ({ url }) => {
  const handle = url.searchParams.get('handle')?.trim() ?? '';
  if (!handle) {
    return new Response(JSON.stringify({ status: 'invalid' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = await readPublicVenue(handle);
  const status =
    result.status === 'ok'
      ? 200
      : result.status === 'unavailable'
        ? 502
        : 404;

  return new Response(JSON.stringify(result), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
  });
};

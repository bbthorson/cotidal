import type { APIRoute } from 'astro';
import { readPublicPalate } from '@/lib/atproto/public-read';

/**
 * Public read endpoint for someone's AT Protocol palate & tasting history,
 * used by `/` overlays (`with=` and `table=`). Works offline for `.test`
 * sample people (`deep.test`, `surf.test`, `both.test`).
 */
export const GET: APIRoute = async ({ url }) => {
  const actor = url.searchParams.get('actor')?.trim() ?? '';
  if (!actor) {
    return new Response(JSON.stringify({ status: 'invalid' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = await readPublicPalate(actor, { taste: true });
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

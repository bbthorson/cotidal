import type { APIRoute } from 'astro';
import { restoredDid } from '@/lib/atproto/session';
import { readPublicPalate } from '@/lib/atproto/public-read';
import { readFollowedPalates } from '@/lib/atproto/follows-overlap';

/**
 * Return the intersection of the signed-in member's Bluesky follows who have
 * published a Cotidal palate, compared against the member's own coordinate.
 * Guests receive an empty list without making any upstream calls.
 */
export const GET: APIRoute = async ({ request }) => {
  const did = await restoredDid(request);
  if (!did) {
    return new Response(JSON.stringify({ friends: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  const own = await readPublicPalate(did);
  if (own.status !== 'ok') {
    return new Response(JSON.stringify({ friends: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  const friends = await readFollowedPalates(did, {
    x: own.palate.x,
    y: own.palate.y,
    aversions: own.palate.aversions,
  });

  return new Response(JSON.stringify({ friends }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=120' },
  });
};

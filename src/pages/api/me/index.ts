import type { APIRoute } from 'astro';
import { getLatestElicitation, getPalateProfile, getPours } from '@/lib/atproto/publish';
import { oauthSession } from '@/lib/atproto/session';
import { profileFromPalate } from '@/lib/palate/profile';
import { json } from './_shared';

/**
 * A signed-in member's initial state for `/map`: palate, recent pours, and
 * latest quiz in one OAuth session restore rather than three parallel ones.
 */
export const GET: APIRoute = async ({ request, url }) => {
  const session = await oauthSession(request);
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!session) return json({ profile: null, pours: [], quiz: null }, 200, headers);

  const rawLimit = Number(url.searchParams.get('limit'));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(100, Math.floor(rawLimit)) : 50;

  const [palate, pours, quiz] = await Promise.all([
    getPalateProfile(session).catch((e) => {
      console.error('Failed to get connected palate:', e);
      return null;
    }),
    getPours(session, limit).catch((e) => {
      console.error('Failed to get connected pours:', e);
      return [];
    }),
    getLatestElicitation(session).catch((e) => {
      console.error('Failed to get connected quiz:', e);
      return null;
    }),
  ]);

  return json(
    {
      profile: palate ? profileFromPalate(palate) : null,
      pours,
      quiz,
    },
    200,
    headers
  );
};

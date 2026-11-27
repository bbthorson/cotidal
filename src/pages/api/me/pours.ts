import type { APIRoute } from 'astro';
import type { LogDrinkOptions } from '@/lib/api-client';
import { getPours } from '@/lib/atproto/publish';
import { oauthSession } from '@/lib/atproto/session';
import { apiErrors } from '@/lib/copy';
import { logPour, sessionStore } from '@/lib/pours/pours.server';
import { fail, json, readJson } from './_shared';

export const GET: APIRoute = async ({ request, url }) => {
  const session = await oauthSession(request);
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!session) return json({ pours: [] }, 200, headers);

  const rawLimit = Number(url.searchParams.get('limit'));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(100, Math.floor(rawLimit)) : 50;

  try {
    return json({ pours: await getPours(session, limit) }, 200, headers);
  } catch (e) {
    console.error('Failed to get connected pours:', e);
    return json({ pours: [] }, 200, headers);
  }
};

export const POST: APIRoute = async ({ request }) => {
  const body = await readJson<Partial<LogDrinkOptions>>(request);
  if (!body.ok) return body.response;

  const session = await oauthSession(request);
  if (!session) return fail(apiErrors.notConnected, 401);

  // Links in what we post for a member point back at this deployment: taken
  // from the request itself rather than from anything the page claims.
  const appUrl = new URL(request.url).origin;
  const result = await logPour(sessionStore(session), body.data, { appUrl });
  if (!result.ok) return fail(result.error, result.status);
  return json({ success: true, profile: result.profile, uri: result.uri });
};

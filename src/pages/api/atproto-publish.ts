import type { APIRoute } from 'astro';
import {
  publishPalateProfile,
  shareToFeed,
  getPalateProfile,
  getPours,
  publishElicitation,
} from '@/lib/atproto/publish';
import { ElicitationWriteSchema } from '@/lib/atproto/records';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import { z } from 'zod';
import { loadRegister } from '@/lib/register.server';
import type { LogDrinkOptions } from '@/lib/api-client';
import { oauthSession } from '@/lib/atproto/session';
import { publicMapPath } from '@/lib/atproto/paths';
import { logPour, sessionStore } from '@/lib/pours.server';
import { apiErrors } from '@/lib/copy';

const ProfileSchema = z.object({
  x: z.number().min(-10).max(10),
  y: z.number().min(-10).max(10),
  dislikesSmoke: z.boolean(),
  dislikesBitter: z.boolean(),
  dislikesAnise: z.boolean(),
  vibeTags: z.record(z.string(), z.number()),
  variance: z.object({ x: z.number().min(0), y: z.number().min(0) }).optional(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const fail = (error: string, status: number) => json({ success: false, error }, status);

export const POST: APIRoute = async ({ request }) => {
  let body: { action?: string; [key: string]: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(apiErrors.invalidRequest, 400);
  }

  // Links in what we post for a member point back at this deployment: taken
  // from the request itself rather than from anything the page claims.
  const appUrl = new URL(request.url).origin;
  const session = await oauthSession(request);

  if (body.action === 'getConnectedPalate') {
    if (!session) return json({ profile: null });
    try {
      const record = await getPalateProfile(session);
      if (!record) return json({ profile: null });
      const profile: UserProfile = {
        x: record.mapCoordinates?.x ?? 0,
        y: record.mapCoordinates?.y ?? 0,
        dislikesSmoke: record.aversions?.smoke ?? false,
        dislikesBitter: record.aversions?.bitter ?? false,
        dislikesAnise: record.aversions?.anise ?? false,
        vibeTags: (record.vibeTags as Record<string, number>) || {},
      };
      return json({ profile });
    } catch (e) {
      console.error('Failed to get connected palate:', e);
      return json({ profile: null });
    }
  }

  if (body.action === 'getConnectedPours') {
    if (!session) return json({ pours: [] });
    try {
      const limit = typeof body.limit === 'number' ? body.limit : undefined;
      return json({ pours: await getPours(session, limit) });
    } catch (e) {
      console.error('Failed to get connected pours:', e);
      return json({ pours: [] });
    }
  }

  if (!session) return fail(apiErrors.notConnected, 401);

  if (body.action === 'publishPalate') {
    const parsed = ProfileSchema.safeParse(body.profile);
    if (!parsed.success) return fail(apiErrors.invalidProfile, 400);

    try {
      const result = await publishPalateProfile(session, parsed.data as UserProfile);
      return json({ success: true, uri: result.uri });
    } catch (e) {
      console.error('Failed to publish palate:', e);
      return fail(apiErrors.publishFailed, 500);
    }
  }

  if (body.action === 'publishElicitation') {
    const parsed = ElicitationWriteSchema.safeParse(body.record);
    if (!parsed.success) return fail(apiErrors.invalidAnswers, 400);

    try {
      const result = await publishElicitation(session, parsed.data);
      return json({ success: true, uri: result.uri });
    } catch (e) {
      console.error('Failed to publish answers:', e);
      return fail(apiErrors.publishAnswersFailed, 500);
    }
  }

  if (body.action === 'sharePalateToFeed') {
    const topDrink = body.topDrink as string;
    const quadrant = body.quadrant as string;

    if (!topDrink || topDrink.length > 100) return fail(apiErrors.invalidDrink, 400);
    if (!quadrant || quadrant.length > 50) return fail(apiErrors.invalidRegion, 400);

    // The post links to the sharer's public map, by DID: a handle can change
    // and a post is never rewritten, so the link has to outlive the handle.
    const mapUrl = new URL(publicMapPath(session.did), appUrl).toString();

    try {
      const result = await shareToFeed(session, topDrink, quadrant, mapUrl);
      return json({ success: true, uri: result.uri });
    } catch (e) {
      console.error('Failed to share to feed:', e);
      return fail(apiErrors.shareFailed, 500);
    }
  }

  if (body.action === 'logDrinkFeedback') {
    // Request body: every field is unvalidated, hence Partial; `logPour`
    // checks it before anything is written (src/lib/pours.server.ts).
    const result = await logPour(sessionStore(session), body.options as Partial<LogDrinkOptions> | undefined, {
      register: await loadRegister(),
      appUrl,
    });
    if (!result.ok) return fail(result.error, result.status);
    return json({ success: true, profile: result.profile, uri: result.uri });
  }

  return fail(apiErrors.unknownAction, 400);
};

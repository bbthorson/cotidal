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

const ProfileSchema = z.object({
  x: z.number().min(-10).max(10),
  y: z.number().min(-10).max(10),
  dislikesSmoke: z.boolean(),
  dislikesBitter: z.boolean(),
  dislikesAnise: z.boolean(),
  vibeTags: z.record(z.string(), z.number()),
  variance: z.object({ x: z.number().min(0), y: z.number().min(0) }).optional(),
});

export const POST: APIRoute = async ({ request }) => {
  let body: { action?: string; [key: string]: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const session = await oauthSession(request);

  if (body.action === 'getConnectedPalate') {
    if (!session) return new Response(JSON.stringify({ profile: null }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
      const record = await getPalateProfile(session);
      if (!record) return new Response(JSON.stringify({ profile: null }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      const profile: UserProfile = {
        x: record.mapCoordinates?.x ?? 0,
        y: record.mapCoordinates?.y ?? 0,
        dislikesSmoke: record.aversions?.smoke ?? false,
        dislikesBitter: record.aversions?.bitter ?? false,
        dislikesAnise: record.aversions?.anise ?? false,
        vibeTags: (record.vibeTags as Record<string, number>) || {},
      };
      return new Response(JSON.stringify({ profile }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      console.error('Failed to get connected palate:', e);
      return new Response(JSON.stringify({ profile: null }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  }

  if (body.action === 'getConnectedPours') {
    if (!session) return new Response(JSON.stringify({ pours: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
      const limit = typeof body.limit === 'number' ? body.limit : undefined;
      const pours = await getPours(session, limit);
      return new Response(JSON.stringify({ pours }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      console.error('Failed to get connected pours:', e);
      return new Response(JSON.stringify({ pours: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  }

  if (!session) {
    return new Response(JSON.stringify({ success: false, error: 'Not connected to Bluesky' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (body.action === 'publishPalate') {
    const parsed = ProfileSchema.safeParse(body.profile);
    if (!parsed.success) return new Response(JSON.stringify({ success: false, error: 'Invalid profile data' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    try {
      const result = await publishPalateProfile(session, parsed.data as UserProfile);
      return new Response(JSON.stringify({ success: true, uri: result.uri }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      console.error('Failed to publish palate:', e);
      return new Response(JSON.stringify({ success: false, error: 'Failed to publish profile' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  if (body.action === 'publishElicitation') {
    const parsed = ElicitationWriteSchema.safeParse(body.record);
    if (!parsed.success) return new Response(JSON.stringify({ success: false, error: 'Invalid answers' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    try {
      const result = await publishElicitation(session, parsed.data);
      return new Response(JSON.stringify({ success: true, uri: result.uri }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      console.error('Failed to publish answers:', e);
      return new Response(JSON.stringify({ success: false, error: 'Failed to publish answers' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  if (body.action === 'sharePalateToFeed') {
    const topDrink = body.topDrink as string;
    const quadrant = body.quadrant as string;
    const appUrl = (body.appUrl as string) || 'https://cotidal.app';

    if (!topDrink || topDrink.length > 100) return new Response(JSON.stringify({ success: false, error: 'Invalid drink name' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    if (!quadrant || quadrant.length > 50) return new Response(JSON.stringify({ success: false, error: 'Invalid quadrant' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    // The post links to the sharer's public map, by DID: a handle can change
    // and a post is never rewritten, so the link has to outlive the handle.
    let mapUrl: string;
    try {
      mapUrl = new URL(publicMapPath(session.did), appUrl).toString();
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Invalid app URL' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    try {
      const result = await shareToFeed(session, topDrink, quadrant, mapUrl);
      return new Response(JSON.stringify({ success: true, uri: result.uri }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      console.error('Failed to share to feed:', e);
      return new Response(JSON.stringify({ success: false, error: 'Failed to share to Bluesky' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  if (body.action === 'logDrinkFeedback') {
    // Request body: every field is unvalidated, hence Partial; `logPour`
    // checks it before anything is written (src/lib/pours.server.ts).
    const result = await logPour(sessionStore(session), body.options as Partial<LogDrinkOptions> | undefined, {
      register: await loadRegister(),
      appUrl: (body.appUrl as string) || 'https://cotidal.app',
    });
    if (!result.ok) {
      return new Response(JSON.stringify({ success: false, error: result.error }), { status: result.status, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({
      success: true,
      profile: result.profile,
      uri: result.uri
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ success: false, error: 'Unknown action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
};

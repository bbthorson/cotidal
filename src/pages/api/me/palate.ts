import type { APIRoute } from 'astro';
import { z } from 'zod';
import { publishPalateProfile } from '@/lib/atproto/publish';
import { oauthSession } from '@/lib/atproto/session';
import { apiErrors } from '@/lib/copy';
import type { UserProfile } from '@/lib/palate/profile';
import { fail, json, readJson } from './_shared';

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
  const body = await readJson(request);
  if (!body.ok) return body.response;

  const session = await oauthSession(request);
  if (!session) return fail(apiErrors.notConnected, 401);

  const parsed = ProfileSchema.safeParse(body.data);
  if (!parsed.success) return fail(apiErrors.invalidProfile, 400);

  try {
    const result = await publishPalateProfile(session, parsed.data as UserProfile);
    return json({ success: true, uri: result.uri });
  } catch (e) {
    console.error('Failed to publish palate:', e);
    return fail(apiErrors.publishFailed, 500);
  }
};

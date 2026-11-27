import type { APIRoute } from 'astro';
import { publishElicitation } from '@/lib/atproto/publish';
import { ElicitationWriteSchema } from '@/lib/atproto/records';
import { oauthSession } from '@/lib/atproto/session';
import { apiErrors } from '@/lib/copy';
import { fail, json, readJson } from './_shared';

export const POST: APIRoute = async ({ request }) => {
  const body = await readJson(request);
  if (!body.ok) return body.response;

  const session = await oauthSession(request);
  if (!session) return fail(apiErrors.notConnected, 401);

  const parsed = ElicitationWriteSchema.safeParse(body.data);
  if (!parsed.success) return fail(apiErrors.invalidAnswers, 400);

  try {
    const result = await publishElicitation(session, parsed.data);
    return json({ success: true, uri: result.uri });
  } catch (e) {
    console.error('Failed to publish answers:', e);
    return fail(apiErrors.publishAnswersFailed, 500);
  }
};

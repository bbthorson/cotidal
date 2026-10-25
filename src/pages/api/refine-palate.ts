import type { APIRoute } from 'astro';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';
import { restoredDid } from '@/lib/atproto/session';
import {
  generationHeaders,
  runWorkersAi,
  type GenerationOutcome,
} from '@/lib/generation';

/**
 * AI Palate Refinement — Member-gated sensory fine-tuning (docs/generation.md).
 *
 * For logged-in users with a restored AT Protocol session.
 * Always answers 200 with usable profile and dossier. Outcome in x-generation header.
 */

const UserProfileSchema = z.object({
  x: z.number(),
  y: z.number(),
  dislikesSmoke: z.boolean(),
  dislikesBitter: z.boolean(),
  dislikesAnise: z.boolean(),
  vibeTags: z.record(z.number()).optional(),
});

const InputSchema = z.object({
  notes: z.string().min(2).max(500),
  currentProfile: UserProfileSchema,
});

export function refinePalateFallback(notes: string, current: z.infer<typeof UserProfileSchema>) {
  const lower = notes.toLowerCase();
  let dx = 0;
  let dy = 0;

  const dislikesSmoke =
    lower.includes('no smoke') || lower.includes('hate smoke') || lower.includes('no peat') || lower.includes('hate peat')
      ? true
      : current.dislikesSmoke;
  const dislikesBitter =
    lower.includes('no bitter') || lower.includes('hate bitter') || lower.includes('too bitter')
      ? true
      : current.dislikesBitter;
  const dislikesAnise =
    lower.includes('no anise') || lower.includes('hate anise') || lower.includes('no licorice') || lower.includes('hate absinthe')
      ? true
      : current.dislikesAnise;

  if (lower.includes('sweet') || lower.includes('sugar') || lower.includes('fruity')) {
    if (lower.includes('less sweet') || lower.includes('not sweet') || lower.includes('too sweet') || lower.includes('no sweet')) {
      dy -= 2;
    } else {
      dy += 2;
    }
  }
  if (lower.includes('dry') || lower.includes('tart') || lower.includes('crisp') || lower.includes('sour') || lower.includes('acid')) {
    dx += 2;
    dy -= 1;
  }
  if (lower.includes('rich') || lower.includes('heavy') || lower.includes('spirit-forward') || lower.includes('boozy')) {
    dx -= 2;
  }

  const updatedProfile = {
    ...current,
    x: Math.max(-10, Math.min(10, Math.round((current.x + dx) * 10) / 10)),
    y: Math.max(-10, Math.min(10, Math.round((current.y + dy) * 10) / 10)),
    dislikesSmoke,
    dislikesBitter,
    dislikesAnise,
  };

  const quadrant =
    updatedProfile.x > 0
      ? updatedProfile.y > 0
        ? 'The Orchard'
        : 'The Salt Line'
      : updatedProfile.y > 0
        ? 'The Vault'
        : 'The Ember';

  const dossier = `Sensory notes recorded. Your coordinate settles into ${quadrant}, calibrated with custom ingredient tolerances.`;

  return { profile: updatedProfile, dossier };
}

const respond = (data: { profile: unknown; dossier: string }, outcome: GenerationOutcome) =>
  new Response(JSON.stringify(data), { status: 200, headers: generationHeaders(outcome) });

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { notes, currentProfile } = parsed.data;
  const fallback = refinePalateFallback(notes, currentProfile);

  // 1. Session gate
  const did = await restoredDid(request);
  if (!did) {
    return respond(fallback, 'unauthenticated');
  }

  // 2. Metering
  const allowed = await checkRateLimit(did);
  if (!allowed) {
    return respond(fallback, 'rate-limited');
  }

  // 3. Model call
  try {
    const systemPrompt = `You are the master sensory calibrator for the Cotidal cocktail catalog.
A member has submitted freeform taste notes, quirks, and dealbreakers.
Evaluate how the user's notes adjust their coordinate:
- deltaX: integer between -3 and +3 (negative pulls toward Rich/barrel/viscous, positive pulls toward Crisp/acid/carbonation).
- deltaY: integer between -3 and +3 (negative pulls toward Savory/dry/mineral, positive pulls toward Sweet/fruit/syrup).
- dislikesSmoke: boolean
- dislikesBitter: boolean
- dislikesAnise: boolean
- dossier: exactly 2 sentences in the brand voice ("Cold instrument, warm secret"): clinical, elegant, literary, describing their calibrated sensory stance.

Respond ONLY with valid JSON in this format:
{
  "deltaX": number,
  "deltaY": number,
  "dislikesSmoke": boolean,
  "dislikesBitter": boolean,
  "dislikesAnise": boolean,
  "dossier": string
}`;

    const userPrompt = `Current profile: x=${currentProfile.x} (-10 Rich to +10 Crisp), y=${currentProfile.y} (-10 Savory to +10 Sweet), dislikesSmoke=${currentProfile.dislikesSmoke}, dislikesBitter=${currentProfile.dislikesBitter}, dislikesAnise=${currentProfile.dislikesAnise}.
User notes: "${notes}".`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    const raw = await runWorkersAi({ messages, maxTokens: 256 });
    if (!raw) return respond(fallback, 'unavailable');

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return respond(fallback, 'unavailable');
    }

    const aiData = JSON.parse(jsonMatch[0]);
    const updatedProfile = {
      ...currentProfile,
      x: Math.max(-10, Math.min(10, Math.round((currentProfile.x + (aiData.deltaX || 0)) * 10) / 10)),
      y: Math.max(-10, Math.min(10, Math.round((currentProfile.y + (aiData.deltaY || 0)) * 10) / 10)),
      dislikesSmoke: typeof aiData.dislikesSmoke === 'boolean' ? aiData.dislikesSmoke : currentProfile.dislikesSmoke,
      dislikesBitter: typeof aiData.dislikesBitter === 'boolean' ? aiData.dislikesBitter : currentProfile.dislikesBitter,
      dislikesAnise: typeof aiData.dislikesAnise === 'boolean' ? aiData.dislikesAnise : currentProfile.dislikesAnise,
    };

    return respond(
      {
        profile: updatedProfile,
        dossier: aiData.dossier || fallback.dossier,
      },
      'model'
    );
  } catch (e) {
    console.error('Refine palate model generation failed, falling back:', e);
    return respond(fallback, 'unavailable');
  }
};

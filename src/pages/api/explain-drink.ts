import type { APIRoute } from 'astro';
import { drinkDatabase } from '@/lib/data';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';
import { restoredDid } from '@/lib/atproto/session';
import {
  explanationFallback,
  generationHeaders,
  runWorkersAi,
  type GenerationOutcome,
} from '@/lib/generation';

/**
 * Why this drink suits you — the one place per-user prose beats a template,
 * and the only live generative route (docs/generation.md).
 *
 * Order matters: validate, authenticate, meter, then call the model. A
 * malformed or unauthenticated request must cost nothing and consume no
 * quota, and nothing bills before a session has actually been restored.
 */

const UserProfileSchema = z.object({
  x: z.number(),
  y: z.number(),
  dislikesSmoke: z.boolean(),
  dislikesBitter: z.boolean(),
});

const InputSchema = z.object({
  drinkName: z.string().min(1).max(100),
  userProfile: UserProfileSchema,
});

/** Always 200 with usable copy. The reason travels in the header. */
const respond = (text: string, outcome: GenerationOutcome) =>
  new Response(JSON.stringify({ text }), { status: 200, headers: generationHeaders(outcome) });

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

  const { drinkName, userProfile: profile } = parsed.data;
  const fallback = explanationFallback(drinkName, profile);

  // Generation is for members. A guest's fallback is derived from their own
  // coordinate and is the whole product for them, so it reads as copy.
  const did = await restoredDid(request);
  if (!did) return respond(fallback, 'unauthenticated');

  if (!(await checkRateLimit(did))) return respond(fallback, 'rate-limited');

  // Only drinks we know about reach the model: an unrecognised name is
  // unvalidated text, and there is nothing to explain about it anyway.
  if (!drinkDatabase.some((d) => d.name === drinkName)) {
    return respond(fallback, 'unavailable');
  }

  const messages = [
    {
      role: 'system' as const,
      content:
        // The house voice (docs/brand.md, "Writing the words"): a bartender who knows the build and has no patience for theatre.
        'You explain a drink recommendation for Cotidal. In 2 short sentences, say what the drink is made of and how that lines up with the guest\'s taste. Voice: dry, concrete, said to one person. Name ingredients and what they do (bitterness, acid, sugar, dilution, smoke), not moods. Describe what the drink is, never what the guest will feel. Never use "delicious", "refreshing", "perfect", "great fit" or nautical theatre. Do NOT mention "coordinates", "algorithms", "x", or "y".',
    },
    {
      role: 'user' as const,
      content: `The guest has been matched with a "${drinkName}". Flavor profile: they lean ${profile.x > 0 ? 'crisp & clean' : 'rich & deep'} and ${profile.y > 0 ? 'sweet & fruity' : 'savory & complex'}. Preferences: ${profile.dislikesSmoke ? 'Not into smoky flavors' : 'Likes smoky flavors'}, ${profile.dislikesBitter ? 'Not a bitterness fan' : 'Enjoys bitterness'}.`,
    },
  ];

  try {
    const text = await runWorkersAi({ messages, maxTokens: 150 });
    if (!text) return respond(fallback, 'unavailable');
    return respond(text, 'model');
  } catch (error) {
    console.error('Explanation generation failed:', error);
    return respond(fallback, 'unavailable');
  }
};

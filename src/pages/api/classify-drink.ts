import type { APIRoute } from 'astro';
import { z } from 'zod';
import { restoredDid } from '@/lib/atproto/session';
import { checkRateLimit } from '@/lib/rate-limit';
import { generationHeaders, runClefDecision, type GenerationOutcome } from '@/lib/generation';
import {
  DRINK_CLASSIFICATION_QUESTIONS,
  fallbackClassifyDrink,
  parseClefDrink,
  type ClassifiedDrink,
} from '@/lib/clef-drink';

/**
 * Classify an unplaced house cocktail from its menu name & description using
 * Cloudflare Clef (`@cf/cloudflare/clef-flash`).
 *
 * Follows all four rules of `docs/generation.md`:
 * 1. Validate input.
 * 2. Gate on `restoredDid(request)`.
 * 3. Meter with `checkRateLimit(did)`.
 * 4. Always answer 200 with usable data + `x-generation` header, falling back
 *    to deterministic `ingredient-match.ts` when Clef is not called.
 */

const InputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(600).optional(),
});

const respond = (classification: ClassifiedDrink, outcome: GenerationOutcome) =>
  new Response(JSON.stringify(classification), { status: 200, headers: generationHeaders(outcome) });

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

  const { name, description } = parsed.data;
  const fallback = fallbackClassifyDrink(name, description);

  const did = await restoredDid(request);
  if (!did) return respond(fallback, 'unauthenticated');

  if (!(await checkRateLimit(did))) return respond(fallback, 'rate-limited');

  const state = description ? `${name}: ${description}` : name;
  try {
    const answers = await runClefDecision(state, DRINK_CLASSIFICATION_QUESTIONS);
    if (!answers) return respond(fallback, 'unavailable');
    return respond(parseClefDrink(answers, fallback), 'model');
  } catch (error) {
    console.error('Clef drink classification failed:', error);
    return respond(fallback, 'unavailable');
  }
};

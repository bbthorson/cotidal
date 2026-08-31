import type { APIRoute } from 'astro';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';
import { restoredDid } from '@/lib/atproto/session';
import {
  GENERATION_MODEL,
  ARCHETYPE_FALLBACK,
  generationHeaders,
  type GenerationOutcome,
} from '@/lib/generation';

/**
 * Place an arbitrary drink on the map. Nothing in the UI calls this yet —
 * `archetypeDrink()` in api-client.ts is reached only from tests — but it is a
 * public endpoint that spends a model call, so it is gated and metered exactly
 * like the live one. See docs/generation.md.
 *
 * `generateObject` with a schema is the pricier of the two calls, which is the
 * reason an unused route is not left open.
 */

const ArchetypeSchema = z.object({
  x: z.number().min(-10).max(10).describe('X-axis: Rich (-10) to Crisp (10)'),
  y: z.number().min(-10).max(10).describe('Y-axis: Savory (-10) to Sweet (10)'),
  hasSmoke: z.boolean(),
  hasAnise: z.boolean(),
  isBitter: z.boolean(),
  tags: z.array(z.string()).describe('Vibe tags like classic, bold, crushable, etc.'),
  oracleReasoning: z.string().describe('Brief explanation for this categorization'),
});

const PLAIN_TEXT = /^[^<>{}\\]*$/;
const PLAIN_TEXT_MESSAGE =
  'Please use plain text only (no special characters like <, >, {, }, \\).';

const InputSchema = z.object({
  drinkName: z.string().min(1).max(100).regex(/^[^<>{}\\]+$/, PLAIN_TEXT_MESSAGE),
  description: z.string().max(1000).regex(PLAIN_TEXT, PLAIN_TEXT_MESSAGE).optional(),
});

/** Always 200 with a usable drink shape. The reason travels in the header. */
const respond = (object: unknown, outcome: GenerationOutcome) =>
  new Response(JSON.stringify(object), { status: 200, headers: generationHeaders(outcome) });

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

  const { drinkName, description } = parsed.data;

  const did = await restoredDid(request);
  if (!did) return respond(ARCHETYPE_FALLBACK, 'unauthenticated');

  if (!(await checkRateLimit(did))) return respond(ARCHETYPE_FALLBACK, 'rate-limited');

  const system = `
    You are a knowledgeable bartender analyzing a drink's flavor profile.

    Determine the drink's position on the flavor map:
    - X-Axis: Is it heavy, decadent, and full-bodied (Rich, -10) or light, acidic, and sharp (Crisp, 10)?
    - Y-Axis: Is it salty, herbaceous, or umami (Savory, -10) or sugary, fruity, and dessert-like (Sweet, 10)?
    - Identify if it contains Smoke, Anise, or strong Bitterness.
    - Assign 3-5 vibe tags from this list: bold, classic, visual, social, comfort, complex, sweet, messy, polarizing, prestige, warm, spice, crushable.

    Provide your response in the requested format with a brief, conversational explanation for your choice.
  `;

  const prompt = `Analyze the drink: "${drinkName}" ${description ? `(${description})` : ''}.`;

  try {
    const { object } = await generateObject({
      model: google(GENERATION_MODEL),
      schema: ArchetypeSchema,
      system,
      prompt,
    });
    return respond(object, 'model');
  } catch (error) {
    console.error('Archetyping failed:', error);
    return respond(ARCHETYPE_FALLBACK, 'unavailable');
  }
};

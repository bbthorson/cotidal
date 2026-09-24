import type { APIRoute } from 'astro';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';
import { restoredDid } from '@/lib/atproto/session';
import {
  ARCHETYPE_FALLBACK,
  generationHeaders,
  runWorkersAi,
  extractJson,
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
    - X-Axis (x): Is it heavy, decadent, and full-bodied (Rich, -10) or light, acidic, and sharp (Crisp, 10)? Return a number between -10 and 10.
    - Y-Axis (y): Is it salty, herbaceous, or umami (Savory, -10) or sugary, fruity, and dessert-like (Sweet, 10)? Return a number between -10 and 10.
    - hasSmoke: boolean (true if it contains noticeable smoke)
    - hasAnise: boolean (true if it contains noticeable anise/licorice)
    - isBitter: boolean (true if it contains strong bitterness)
    - tags: array of 3-5 vibe tags chosen from: bold, classic, visual, social, comfort, complex, sweet, messy, polarizing, prestige, warm, spice, crushable.
    - oracleReasoning: brief conversational explanation for this categorization.

    Respond with ONLY a JSON object matching this structure:
    {
      "x": number,
      "y": number,
      "hasSmoke": boolean,
      "hasAnise": boolean,
      "isBitter": boolean,
      "tags": string[],
      "oracleReasoning": string
    }
  `;

  const prompt = `Analyze the drink: "${drinkName}" ${description ? `(${description})` : ''}.`;

  try {
    const raw = await runWorkersAi({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      maxTokens: 300,
    });

    if (!raw) return respond(ARCHETYPE_FALLBACK, 'unavailable');

    const parsedJson = extractJson(raw);
    const validated = ArchetypeSchema.safeParse(parsedJson);
    if (!validated.success) {
      console.error('Archetype validation failed:', validated.error);
      return respond(ARCHETYPE_FALLBACK, 'unavailable');
    }

    return respond(validated.data, 'model');
  } catch (error) {
    console.error('Archetyping failed:', error);
    return respond(ARCHETYPE_FALLBACK, 'unavailable');
  }
};

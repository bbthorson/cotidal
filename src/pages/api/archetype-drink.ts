import type { APIRoute } from 'astro';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';

const ArchetypeSchema = z.object({
  x: z.number().min(-10).max(10).describe('X-axis: Rich (-10) to Crisp (10)'),
  y: z.number().min(-10).max(10).describe('Y-axis: Savory (-10) to Sweet (10)'),
  hasSmoke: z.boolean(),
  hasAnise: z.boolean(),
  isBitter: z.boolean(),
  tags: z.array(z.string()).describe('Vibe tags like classic, bold, crushable, etc.'),
  oracleReasoning: z.string().describe('Brief explanation for this categorization'),
});

const InputSchema = z.object({
  drinkName: z.string().min(1).max(100).regex(/^[^<>{}\\]+$/, "Please use plain text only (no special characters like <, >, {, }, \\)."),
  description: z.string().max(1000).regex(/^[^<>{}\\]*$/, "Please use plain text only (no special characters like <, >, {, }, \\).").optional(),
});

export const POST: APIRoute = async ({ request }) => {
  const isAllowed = await checkRateLimit();
  if (!isAllowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { drinkName?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parseRes = InputSchema.safeParse(body);
  if (!parseRes.success) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { drinkName: validName, description: validDescription } = parseRes.data;

  const system = `
    You are a knowledgeable bartender analyzing a drink's flavor profile.

    Determine the drink's position on the flavor map:
    - X-Axis: Is it heavy, decadent, and full-bodied (Rich, -10) or light, acidic, and sharp (Crisp, 10)?
    - Y-Axis: Is it salty, herbaceous, or umami (Savory, -10) or sugary, fruity, and dessert-like (Sweet, 10)?
    - Identify if it contains Smoke, Anise, or strong Bitterness.
    - Assign 3-5 vibe tags from this list: bold, classic, visual, social, comfort, complex, sweet, messy, polarizing, prestige, warm, spice, crushable.

    Provide your response in the requested format with a brief, conversational explanation for your choice.
  `;

  const prompt = `Analyze the drink: "${validName}" ${validDescription ? `(${validDescription})` : ''}.`;

  try {
    const { object } = await generateObject({
      model: google('gemini-1.5-flash'),
      schema: ArchetypeSchema,
      system,
      prompt,
    });

    return new Response(JSON.stringify(object), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Archetyping Error:", error);
    return new Response(JSON.stringify({
      x: 0,
      y: 0,
      hasSmoke: false,
      hasAnise: false,
      isBitter: false,
      tags: ['classic'],
      oracleReasoning: "Couldn't get a full read on this one, but it's a classic."
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

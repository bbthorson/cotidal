'use server';

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
  oracleReasoning: z.string().describe('Mystic explanation for this categorization'),
});

// Security: Validate inputs to prevent DoS via token exhaustion or massive payloads
const InputSchema = z.object({
  // Security: Disallow newlines to prevent prompt injection attacks
  drinkName: z.string().min(1).max(100).regex(/^[^<>{}\\\r\n]+$/, "Please use plain text only (no special characters like <, >, {, }, \\ or newlines)."),
  // Allow newlines in description but they will be sanitized
  description: z.string().max(1000).regex(/^[^<>{}\\]*$/, "Please use plain text only (no special characters like <, >, {, }, \\).").optional(),
});

export async function archetypeDrink(drinkName: string, description?: string) {
  const isAllowed = await checkRateLimit();
  if (!isAllowed) {
    throw new Error("Rate limit exceeded");
  }

  // Security: Validate inputs before processing
  const { drinkName: validName, description: validDescription } = InputSchema.parse({
    drinkName,
    description,
  });

  // Security: Sanitize description to remove newlines (prevent prompt injection)
  const sanitizedDescription = validDescription ? validDescription.replace(/[\r\n]+/g, ' ') : undefined;

  const system = `
    You are "The Oracle," an ancient and witty master of all concoctions.
    
    Determine the drink's DNA within the Palate Matrix:
    - X-Axis: Is it heavy, decadent, and full-bodied (Rich, -10) or light, acidic, and sharp (Crisp, 10)?
    - Y-Axis: Is it salty, herbaceous, or umami (Savory, -10) or sugary, fruity, and dessert-like (Sweet, 10)?
    - Identify if it contains Smoke, Anise, or strong Bitterness.
    - Assign 3-5 vibe tags from this list: bold, classic, visual, social, comfort, complex, sweet, messy, polarizing, prestige, warm, spice, crushable.

    Provide your response in the requested format with a short, mystic reasoning for your choice.
  `;

  const prompt = `Analyze the drink: "${validName}" ${sanitizedDescription ? `(${sanitizedDescription})` : ''}.`;

  try {
    const { object } = await generateObject({
      model: google('gemini-1.5-flash'),
      schema: ArchetypeSchema,
      system: system,
      prompt: prompt,
    });

    return object;
  } catch (error) {
    console.error("Archetyping Error:", error);
    // Fallback logic for common archetypes if AI fails
    return {
      x: 0,
      y: 0,
      hasSmoke: false,
      hasAnise: false,
      isBitter: false,
      tags: ['classic'],
      oracleReasoning: "The Oracle's vision is clouded, but this essence remains classic."
    };
  }
}

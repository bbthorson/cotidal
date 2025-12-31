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

// SECURITY: Input validation schema to prevent large payloads (DoS/Cost)
const InputSchema = z.object({
  drinkName: z.string().max(100, "Drink name too long").trim(),
  description: z.string().max(1000, "Description too long").optional(),
});

export async function archetypeDrink(drinkName: string, description?: string) {
  const isAllowed = await checkRateLimit();
  if (!isAllowed) {
    throw new Error("Rate limit exceeded");
  }

  // SECURITY: Validate inputs before processing
  const inputResult = InputSchema.safeParse({ drinkName, description });
  if (!inputResult.success) {
    console.warn("Archetype Input Validation Failed:", inputResult.error);
    // Return fallback immediately
    return {
      x: 0,
      y: 0,
      hasSmoke: false,
      hasAnise: false,
      isBitter: false,
      tags: ['classic'],
      oracleReasoning: "The Oracle remains silent; the offering was too chaotic."
    };
  }

  const safeDrinkName = inputResult.data.drinkName;
  const safeDescription = inputResult.data.description;

  const prompt = `
    You are "The Oracle," an ancient and witty master of all concoctions.
    Analyze the drink: "${safeDrinkName}" ${safeDescription ? `(${safeDescription})` : ''}.
    
    Determine its DNA within the Palate Matrix:
    - X-Axis: Is it heavy, decadent, and full-bodied (Rich, -10) or light, acidic, and sharp (Crisp, 10)?
    - Y-Axis: Is it salty, herbaceous, or umami (Savory, -10) or sugary, fruity, and dessert-like (Sweet, 10)?
    - Identify if it contains Smoke, Anise, or strong Bitterness.
    - Assign 3-5 vibe tags from this list: bold, classic, visual, social, comfort, complex, sweet, messy, polarizing, prestige, warm, spice, crushable.

    Provide your response in the requested format with a short, mystic reasoning for your choice.
  `;

  try {
    const { object } = await generateObject({
      model: google('gemini-1.5-flash'),
      schema: ArchetypeSchema,
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

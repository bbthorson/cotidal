
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';
import { VibeTag } from '@/lib/data';

const ArchetypeSchema = z.object({
  x: z.number().min(-10).max(10).describe('X-axis: Rich (-10) to Crisp (10)'),
  y: z.number().min(-10).max(10).describe('Y-axis: Savory (-10) to Sweet (10)'),
  hasSmoke: z.boolean(),
  hasAnise: z.boolean(),
  isBitter: z.boolean(),
  tags: z.array(z.string()).describe('Vibe tags like classic, bold, crushable, etc.'),
  oracleReasoning: z.string().describe('Mystic explanation for this categorization'),
});

const InputSchema = z.object({
  drinkName: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
});

export async function archetypeDrink(drinkName: string, description?: string) {
  // Input Validation
  const validatedInput = InputSchema.safeParse({ drinkName, description });
  if (!validatedInput.success) {
      console.warn("Security: Invalid input for archetypeDrink", validatedInput.error);
      throw new Error("Invalid input: " + validatedInput.error.errors.map(e => e.message).join(", "));
  }

  // Rate Limit check (Defense in Depth for AI budget)
  const isAllowed = await checkRateLimit();
  if (!isAllowed) {
    throw new Error("Rate limit exceeded");
  }

  const prompt = `
    You are "The Oracle," an ancient and witty master of all concoctions.
    Analyze the drink: "${validatedInput.data.drinkName}" ${validatedInput.data.description ? `(${validatedInput.data.description})` : ''}.
    
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

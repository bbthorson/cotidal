'use server';

import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { drinkDatabase } from '@/lib/data';
import { z } from 'zod';

// Security: Define strict input schema
const UserProfileSchema = z.object({
  x: z.number(),
  y: z.number(),
  dislikesSmoke: z.boolean(),
  dislikesBitter: z.boolean(),
  dislikesAnise: z.boolean().optional(),
  vibeTags: z.record(z.string(), z.number()).optional(),
});

export async function explainDrinkMatch(drinkName: string, userProfile: unknown) {
  // SECURITY: Whitelist check to prevent prompt injection.
  const isValidDrink = drinkDatabase.some(d => d.name === drinkName);

  if (!isValidDrink) {
    console.warn(`Security: Blocked potential prompt injection with drinkName: "${drinkName}"`);
    // Return a safe fallback immediately without calling the AI.
    // We can't access userProfile safely yet, so we use a generic fallback.
    return `This drink is a curated match for your unique palate profile.`;
  }

  // SECURITY: Input validation using Zod
  const result = UserProfileSchema.safeParse(userProfile);

  if (!result.success) {
    console.error("Security: Invalid userProfile structure", result.error);
    return `Because you have specific tastes, the ${drinkName} is an excellent choice for your palate.`;
  }

  const profile = result.data;

  const prompt = `
    You are a master mixologist.
    The user matched with a "${drinkName}".
    User Profile:
    - Palate: ${profile.x > 0 ? 'Savory/Dry' : 'Sweet'} and ${profile.y > 0 ? 'Crisp' : 'Rich'}
    - Vibe: They identified with various vibes based on their choices.
    - Specific Tastes: ${profile.dislikesSmoke ? 'No Smoke' : 'Loves/Tolerates Smoke'}, ${profile.dislikesBitter ? 'No Bitter' : 'Loves/Tolerates Bitter'}.

    Write a 2-sentence explanation of why this drink is their perfect match.
    Tone: Sophisticated, Witty, and Personal.
    Do NOT mention "coordinates" or "algorithms".
  `;

  try {
    const { text } = await generateText({
      model: google('gemini-1.5-flash'), // Using a widely available model, can be updated.
      prompt: prompt,
    });
    return text;
  } catch (error) {
    console.error("AI Generation Error:", error);
    // Fallback if AI fails (e.g., missing API key)
    return `Because you prefer ${profile.x > 0 ? 'Savory' : 'Sweet'} and ${profile.y > 0 ? 'Crisp' : 'Rich'} notes, the ${drinkName} is an excellent choice for your palate.`;
  }
}

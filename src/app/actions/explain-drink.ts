'use server';

import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { drinkDatabase } from '@/lib/data';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';

const UserProfileSchema = z.object({
  x: z.number(),
  y: z.number(),
  dislikesSmoke: z.boolean(),
  dislikesBitter: z.boolean(),
});

export async function explainDrinkMatch(drinkName: string, userProfile: unknown) {
  const isAllowed = await checkRateLimit();
  if (!isAllowed) {
    return "I'm slammed right now — try again in a minute.";
  }

  // SECURITY: Validate userProfile structure to prevent injection/crashes
  const profileResult = UserProfileSchema.safeParse(userProfile);

  if (!profileResult.success) {
      console.warn("Security: Invalid userProfile structure", profileResult.error);
      return "This drink is an excellent choice for your palate.";
  }

  const profile = profileResult.data;

  // SECURITY: Whitelist check to prevent prompt injection.
  const isValidDrink = drinkDatabase.some(d => d.name === drinkName);

  if (!isValidDrink) {
    console.warn(`Security: Blocked potential prompt injection with drinkName: "${drinkName}"`);
    // Return a safe fallback immediately without calling the AI.
    return `Good pick — you lean ${profile.x > 0 ? 'crisp' : 'rich'} and ${profile.y > 0 ? 'sweet' : 'savory'}, so this one's right in your wheelhouse.`;
  }

  const prompt = `
    You are a knowledgeable, friendly bartender explaining a drink recommendation.
    The guest has been matched with a "${drinkName}".

    Their flavor profile:
    - They lean ${profile.x > 0 ? 'crisp & clean' : 'rich & deep'} and ${profile.y > 0 ? 'sweet & fruity' : 'savory & complex'}
    - Preferences: ${profile.dislikesSmoke ? 'Not into smoky flavors' : 'Likes smoky flavors'}, ${profile.dislikesBitter ? 'Not a bitterness fan' : 'Enjoys bitterness'}.

    In 2 casual sentences, explain why this drink is a great fit for them.
    Voice: Warm, knowledgeable, approachable — like a bartender who really knows their stuff.
    Talk about the actual flavors and why they work for this person.
    Do NOT mention "coordinates", "algorithms", "x", or "y".
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
    return `You lean ${profile.x > 0 ? 'crisp' : 'rich'} and ${profile.y > 0 ? 'sweet' : 'savory'} — a ${drinkName} hits that sweet spot perfectly.`;
  }
}

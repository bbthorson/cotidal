'use server';

import { drinkDatabase } from '@/lib/data';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';
import { getDrinkExplanation } from '@/lib/drink-explanation';

const UserProfileSchema = z.object({
  x: z.number(),
  y: z.number(),
  dislikesSmoke: z.boolean(),
  dislikesBitter: z.boolean(),
});

export async function explainDrinkMatch(drinkName: string, userProfile: unknown) {
  const isAllowed = await checkRateLimit();
  if (!isAllowed) {
    return "The Sommelier is currently overwhelmed with requests. Please try again in a minute.";
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
    return `The Oracle senses your essence is drawn to the ${profile.x > 0 ? 'Crisp' : 'Rich'} and ${profile.y > 0 ? 'Sweet' : 'Savory'} vibration of this match.`;
  }

  try {
    // Optimization: Delegated to library function with LRU Caching
    const text = await getDrinkExplanation(drinkName, profile);
    return text;
  } catch (error) {
    console.error("AI Generation Error:", error);
    // Fallback if AI fails (e.g., missing API key)
    return `The Oracle senses your aura aligns with the ${profile.x > 0 ? 'Crisp' : 'Rich'} and ${profile.y > 0 ? 'Sweet' : 'Savory'} essence of this ${drinkName}.`;
  }
}

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

// Optimization: Cache AI responses to reduce latency and API costs.
// The prompt depends on quadrant buckets (not exact coordinates), so cardinality is low.
const explanationCache = new Map<string, string>();
const MAX_CACHE_SIZE = 100;

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

  // Optimization: Check cache to prevent expensive AI calls for identical contexts
  // We use effective prompt parameters (quadrants) rather than raw coordinates
  const cacheKey = `${drinkName}|${profile.x > 0}|${profile.y > 0}|${profile.dislikesSmoke}|${profile.dislikesBitter}`;

  if (explanationCache.has(cacheKey)) {
    // Refresh LRU: delete and re-insert to move to end of Map
    const response = explanationCache.get(cacheKey)!;
    explanationCache.delete(cacheKey);
    explanationCache.set(cacheKey, response);
    return response;
  }

  const prompt = `
    You are "The Oracle," a witty, sophisticated, and slightly mystic sommelier.
    A seeker has matched with the essence of a "${drinkName}".
    
    The Seeker's Palate Aura:
    - Essence: ${profile.x > 0 ? 'Crisp & Clean' : 'Rich & Deep'} and ${profile.y > 0 ? 'Sweet & Fruity' : 'Savory & Complex'}
    - Elemental Filters: ${profile.dislikesSmoke ? 'Avoids Smoke' : 'Embraces Smoke'}, ${profile.dislikesBitter ? 'Avoids Bitterness' : 'Embraces Bitterness'}.

    Provide a 2-sentence revelation of why this drink perfectly aligns with their palate's unique vibration.
    Voice: Witty, Sophisticated, Mystic. 
    Use words like "Aura", "Essence", "Vibration", or "Oracle".
    Do NOT mention "coordinates", "algorithms", "x", or "y".
  `;

  try {
    const { text } = await generateText({
      model: google('gemini-1.5-flash'), // Using a widely available model, can be updated.
      prompt: prompt,
    });

    // Optimization: Store in cache with LRU eviction
    if (explanationCache.size >= MAX_CACHE_SIZE) {
      const firstKey = explanationCache.keys().next().value;
      if (firstKey) explanationCache.delete(firstKey);
    }
    explanationCache.set(cacheKey, text);

    return text;
  } catch (error) {
    console.error("AI Generation Error:", error);
    // Fallback if AI fails (e.g., missing API key)
    const fallbackText = `The Oracle senses your aura aligns with the ${profile.x > 0 ? 'Crisp' : 'Rich'} and ${profile.y > 0 ? 'Sweet' : 'Savory'} essence of this ${drinkName}.`;

    // Optimization: Cache the fallback response to prevent repeated error logging and retries
    if (explanationCache.size >= MAX_CACHE_SIZE) {
      const firstKey = explanationCache.keys().next().value;
      if (firstKey) explanationCache.delete(firstKey);
    }
    explanationCache.set(cacheKey, fallbackText);

    return fallbackText;
  }
}

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

// Performance: LRU Cache implementation
// Keeps the most recently used explanations in memory to avoid redundant AI calls.
class LRUCache<K, V> {
  private map = new Map<K, V>();
  constructor(private readonly limit: number) {}

  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (value !== undefined) {
      // Refresh item by re-inserting it
      this.map.delete(key);
      this.map.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.limit) {
      // Evict oldest (first inserted in Map)
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) this.map.delete(firstKey);
    }
    this.map.set(key, value);
  }
}

// Global cache instance (persists in warm serverless containers)
// Limit to 100 to prevent memory bloating
const explanationCache = new LRUCache<string, string>(100);

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

  // Performance: Check cache first
  // Key includes all variables that affect the prompt: drink name + user profile stats
  const cacheKey = `${drinkName}:${profile.x}:${profile.y}:${profile.dislikesSmoke}:${profile.dislikesBitter}`;
  const cached = explanationCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // SECURITY: Whitelist check to prevent prompt injection.
  const isValidDrink = drinkDatabase.some(d => d.name === drinkName);

  if (!isValidDrink) {
    console.warn(`Security: Blocked potential prompt injection with drinkName: "${drinkName}"`);
    // Return a safe fallback immediately without calling the AI.
    return `The Oracle senses your essence is drawn to the ${profile.x > 0 ? 'Crisp' : 'Rich'} and ${profile.y > 0 ? 'Sweet' : 'Savory'} vibration of this match.`;
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

    // Performance: Cache the successful result
    explanationCache.set(cacheKey, text);
    return text;
  } catch (error) {
    console.error("AI Generation Error:", error);
    // Fallback if AI fails (e.g., missing API key)
    const fallback = `The Oracle senses your aura aligns with the ${profile.x > 0 ? 'Crisp' : 'Rich'} and ${profile.y > 0 ? 'Sweet' : 'Savory'} essence of this ${drinkName}.`;

    // Performance: Cache the fallback too to prevent redundant error retries
    explanationCache.set(cacheKey, fallback);
    return fallback;
  }
}

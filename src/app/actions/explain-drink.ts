'use server';

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

  // Delegate business logic and caching to lib function
  return await getDrinkExplanation(drinkName, profileResult.data);
}

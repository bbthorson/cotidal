'use server';

import { getDrinkExplanation } from '@/lib/drink-explanation';

export async function explainDrinkMatch(drinkName: string, userProfile: unknown) {
  return getDrinkExplanation(drinkName, userProfile);
}

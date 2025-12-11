'use server';

import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

export async function explainDrinkMatch(drinkName: string, userProfile: any) {
  const prompt = `
    You are a master mixologist.
    The user matched with a "${drinkName}".
    User Profile:
    - Palate: ${userProfile.x > 0 ? 'Savory/Dry' : 'Sweet'} and ${userProfile.y > 0 ? 'Crisp' : 'Rich'}
    - Vibe: They identified with various vibes based on their choices.
    - Specific Tastes: ${userProfile.dislikesSmoke ? 'No Smoke' : 'Loves/Tolerates Smoke'}, ${userProfile.dislikesBitter ? 'No Bitter' : 'Loves/Tolerates Bitter'}.

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
    return `Because you prefer ${userProfile.x > 0 ? 'Savory' : 'Sweet'} and ${userProfile.y > 0 ? 'Crisp' : 'Rich'} notes, the ${drinkName} is an excellent choice for your palate.`;
  }
}

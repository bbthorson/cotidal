import type { APIRoute } from 'astro';
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

export const POST: APIRoute = async ({ request }) => {
  const isAllowed = await checkRateLimit();
  if (!isAllowed) {
    return new Response(JSON.stringify({ text: "I'm slammed right now — try again in a minute." }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { drinkName?: string; userProfile?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { drinkName, userProfile } = body;
  if (!drinkName) {
    return new Response(JSON.stringify({ error: 'Missing drinkName' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const profileResult = UserProfileSchema.safeParse(userProfile);
  if (!profileResult.success) {
    return new Response(JSON.stringify({ text: "This drink is an excellent choice for your palate." }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const profile = profileResult.data;
  const isValidDrink = drinkDatabase.some(d => d.name === drinkName);

  if (!isValidDrink) {
    return new Response(
      JSON.stringify({
        text: `Good pick — you lean ${profile.x > 0 ? 'crisp' : 'rich'} and ${profile.y > 0 ? 'sweet' : 'savory'}, so this one's right in your wheelhouse.`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
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
      model: google('gemini-2.5-flash-lite'),
      prompt,
    });
    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("AI Generation Error:", error);
    return new Response(
      JSON.stringify({
        text: `You lean ${profile.x > 0 ? 'crisp' : 'rich'} and ${profile.y > 0 ? 'sweet' : 'savory'} — a ${drinkName} hits that sweet spot perfectly.`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

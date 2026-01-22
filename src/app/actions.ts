
'use server';

import { ingredientBasedCocktailSearch } from '@/ai/flows/ingredient-based-cocktail-search';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';

const formSchema = z.object({
  ingredientsDescription: z
    .string()
    .min(10, "Please provide a more detailed description of your ingredients.")
    .max(500, "Description is too long (max 500 characters).")
    // Security: Explicitly ban newlines to prevent prompt injection, even if sanitization fails.
    .regex(/^[^<>{}\\\r\n]+$/, "Please use plain text only (no newlines or special characters like <, >, {, }, \\)."),
});

export async function findCocktailRecipes(prevState: { data: string; error: string } | null, formData: FormData) {
  const isAllowed = await checkRateLimit();
  if (!isAllowed) {
    return { error: 'Too many requests. Please try again later.', data: '' };
  }

  // Security: Sanitize input by replacing newlines with spaces to prevent prompt injection.
  const rawInput = formData.get('ingredientsDescription');
  const sanitizedInput = typeof rawInput === 'string'
    ? rawInput.replace(/[\r\n]+/g, ' ').trim()
    : rawInput;

  const validatedFields = formSchema.safeParse({
    ingredientsDescription: sanitizedInput,
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors.ingredientsDescription?.[0] || 'Invalid input.',
      data: '',
    };
  }

  try {
    const result = await ingredientBasedCocktailSearch(validatedFields.data);
    return { data: result.recipes, error: '' };
  } catch (error) {
    console.error('AI Error:', error);
    return { error: 'An error occurred while searching for recipes. Please try again.', data: '' };
  }
}

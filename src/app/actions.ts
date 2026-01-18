
'use server';

import { ingredientBasedCocktailSearch } from '@/ai/flows/ingredient-based-cocktail-search';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';

const formSchema = z.object({
  ingredientsDescription: z
    .string()
    .min(10, "Please provide a more detailed description of your ingredients.")
    .max(500, "Description is too long (max 500 characters).")
    .regex(/^[^<>{}\\]+$/, "Please use plain text only (no special characters like <, >, {, }, \\)."),
});

export async function findCocktailRecipes(prevState: { data: string; error: string } | null, formData: FormData) {
  const isAllowed = await checkRateLimit();
  if (!isAllowed) {
    return { error: 'Too many requests. Please try again later.', data: '' };
  }

  const validatedFields = formSchema.safeParse({
    ingredientsDescription: formData.get('ingredientsDescription'),
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors.ingredientsDescription?.[0] || 'Invalid input.',
      data: '',
    };
  }

  // Security: Sanitize input to remove newlines (prevent prompt injection)
  const sanitizedData = {
    ...validatedFields.data,
    ingredientsDescription: validatedFields.data.ingredientsDescription.replace(/[\r\n]+/g, ' ').trim(),
  };

  try {
    const result = await ingredientBasedCocktailSearch(sanitizedData);
    return { data: result.recipes, error: '' };
  } catch (error) {
    console.error('AI Error:', error);
    return { error: 'An error occurred while searching for recipes. Please try again.', data: '' };
  }
}


'use server';

import { ingredientBasedCocktailSearch, type IngredientBasedCocktailSearchInput } from '@/ai/flows/ingredient-based-cocktail-search';
import { z } from 'zod';

const formSchema = z.object({
  ingredientsDescription: z
    .string()
    .min(10, "Please provide a more detailed description of your ingredients.")
    .max(1000, "Description is too long (max 1000 characters)."),
});

export async function findCocktailRecipes(prevState: any, formData: FormData) {
  const validatedFields = formSchema.safeParse({
    ingredientsDescription: formData.get('ingredientsDescription'),
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

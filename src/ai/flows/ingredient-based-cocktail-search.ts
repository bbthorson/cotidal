'use server';
/**
 * @fileOverview A cocktail recipe search AI agent.
 *
 * - ingredientBasedCocktailSearch - A function that handles the cocktail recipe search process.
 * - IngredientBasedCocktailSearchInput - The input type for the ingredientBasedCocktailSearch function.
 * - IngredientBasedCocktailSearchOutput - The return type for the ingredientBasedCocktailSearch function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IngredientBasedCocktailSearchInputSchema = z.object({
  ingredientsDescription: z
    .string()
    .describe("A description of the ingredients the user has available."),
});
export type IngredientBasedCocktailSearchInput = z.infer<typeof IngredientBasedCocktailSearchInputSchema>;

const IngredientBasedCocktailSearchOutputSchema = z.object({
  recipes: z.string().describe("A list of cocktail recipes that can be made with the given ingredients."),
});
export type IngredientBasedCocktailSearchOutput = z.infer<typeof IngredientBasedCocktailSearchOutputSchema>;

export async function ingredientBasedCocktailSearch(input: IngredientBasedCocktailSearchInput): Promise<IngredientBasedCocktailSearchOutput> {
  return ingredientBasedCocktailSearchFlow(input);
}

const getCocktailRecipes = ai.defineTool(
  {
    name: 'getCocktailRecipes',
    description: 'Search a cocktail recipe API for recipes that use the given ingredients.',
    inputSchema: z.object({
      ingredients: z.string().describe('A description of the ingredients to search for.'),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    // In a real application, this would call an external cocktail recipe API.
    // For this example, we'll just return a placeholder response.
    return `Placeholder: Recipes for cocktails with ${input.ingredients}`;
  }
);

const prompt = ai.definePrompt({
  name: 'ingredientBasedCocktailSearchPrompt',
  input: {schema: IngredientBasedCocktailSearchInputSchema},
  output: {schema: IngredientBasedCocktailSearchOutputSchema},
  tools: [getCocktailRecipes],
  prompt: `You are a cocktail expert. A user will provide you with a description of ingredients that they have on hand. Use the getCocktailRecipes tool to find recipes that use those ingredients. Return a list of cocktail recipes that can be made with the given ingredients.

Ingredients description: {{{ingredientsDescription}}}`,
});

const ingredientBasedCocktailSearchFlow = ai.defineFlow(
  {
    name: 'ingredientBasedCocktailSearchFlow',
    inputSchema: IngredientBasedCocktailSearchInputSchema,
    outputSchema: IngredientBasedCocktailSearchOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

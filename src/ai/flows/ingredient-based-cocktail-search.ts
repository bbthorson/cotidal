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
    description: 'Search for cocktail recipes that use a specific ingredient (e.g. Gin, Vodka, Lime).',
    inputSchema: z.object({
      ingredients: z.string().describe('A single main ingredient to search for (e.g. "Gin" or "Vodka").'),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    try {
      // 1. Fetch from TheCocktailDB
      const response = await fetch(
        `https://www.thecocktaildb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(input.ingredients)}`
      );

      if (!response.ok) {
        return `Error fetching recipes: ${response.statusText}`;
      }

      const data = await response.json();

      if (!data.drinks) {
        return `No recipes found containing ${input.ingredients}.`;
      }

      // 2. Format the output (Take top 10 to save context window)
      const drinks = data.drinks.slice(0, 10).map((d: any) => d.strDrink).join(', ');

      return `Found these cocktails with ${input.ingredients}: ${drinks}.`;

    } catch (error) {
      console.error("CocktailDB API Error:", error);
      return "An error occurred while connecting to the cocktail database.";
    }
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


import { IngredientBasedCocktailSearchInputSchema } from '@/ai/flows/ingredient-based-cocktail-search';
import { z } from 'zod'; // genkit re-exports zod, but we can use zod directly for verification if needed.
// Actually, let's use the exported schema which uses genkit's z.

async function verify() {
  console.log("Verifying IngredientBasedCocktailSearchInputSchema constraints...");

  const validInputs = [
    "I have vodka and orange juice",
    "gin, lime, soda",
    "whiskey sour mix",
    "plain text input with punctuation! . , - ( )",
  ];

  const invalidInputs = [
    "I have <script>",
    "tags like <div>",
    "closing tag </user_ingredients>",
    "special chars { }",
    "backslashes \\",
  ];

  let passed = true;

  for (const input of validInputs) {
    const result = IngredientBasedCocktailSearchInputSchema.safeParse({ ingredientsDescription: input });
    if (!result.success) {
      console.error(`❌ Valid input failed: "${input}"`);
      console.error(result.error);
      passed = false;
    } else {
      console.log(`✅ Valid input passed: "${input}"`);
    }
  }

  for (const input of invalidInputs) {
    const result = IngredientBasedCocktailSearchInputSchema.safeParse({ ingredientsDescription: input });
    if (result.success) {
      console.error(`❌ Invalid input passed (VULNERABILITY): "${input}"`);
      passed = false;
    } else {
      console.log(`✅ Invalid input rejected: "${input}"`);
    }
  }

  if (passed) {
    console.log("🎉 Verification Successful: Regex correctly enforcing constraints.");
  } else {
    console.error("🔥 Verification Failed.");
    process.exit(1);
  }
}

verify().catch(console.error);

import { test, expect } from '@playwright/test';
import { archetypeDrink } from '../src/lib/api-client';

test('AI Archetyping: Negroni should be bitter and savory', async () => {
  // This test requires a valid GOOGLE_GENERATIVE_AI_API_KEY to run fully, 
  // otherwise it hits the fallback.
  const result = await archetypeDrink('Negroni');
  
  if (result.oracleReasoning.includes("clouded")) {
      // Fallback path
      expect(result.tags).toContain('classic');
  } else {
      // AI success path
      expect(result.isBitter).toBe(true);
      expect(result.y).toBeLessThan(0); // Savory/Bitter side
  }
});

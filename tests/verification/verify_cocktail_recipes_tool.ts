
import { _fetchCocktailRecipesForTest } from '@/ai/flows/ingredient-based-cocktail-search';
import assert from 'assert';

// Mock fetch
const originalFetch = global.fetch;

// Helper to delay (unused but kept for reference if needed)
// const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
  console.log('Running verification test for cocktail search timeout...');

  // TEST 1: Simulate Timeout
  console.log('Test 1: Simulating Timeout...');
  global.fetch = async (input, init) => {
    // Check if signal is present
    if (init?.signal) {
      // Wait longer than timeout?
      // Actually, AbortSignal.timeout triggers automatically.
      // But we can't wait 5 seconds in test.
      // So we should just verify that if fetch throws TimeoutError, it is handled.

      // Option A: Just throw TimeoutError immediately to verify the CATCH block.
      const error = new Error('The operation was aborted due to timeout');
      error.name = 'TimeoutError';
      throw error;
    }
    return new Response(JSON.stringify({ drinks: [] }));
  };

  const result1 = await _fetchCocktailRecipesForTest({ ingredients: 'Gin' });
  console.log('Result 1:', result1);
  assert.strictEqual(
    result1,
    "The cocktail database is currently unresponsive. Please try again later.",
    "Failed to handle TimeoutError correctly"
  );
  console.log('✅ Test 1 Passed (TimeoutError handled)');

  // TEST 2: Simulate AbortError (Legacy/Manual abort compatibility)
  console.log('Test 2: Simulating AbortError...');
  global.fetch = async () => {
    const error = new Error('The operation was aborted');
    error.name = 'AbortError';
    throw error;
  };

  const result2 = await _fetchCocktailRecipesForTest({ ingredients: 'Gin' });
  console.log('Result 2:', result2);
  assert.strictEqual(
    result2,
    "The cocktail database is currently unresponsive. Please try again later.",
    "Failed to handle AbortError correctly"
  );
  console.log('✅ Test 2 Passed (AbortError handled)');

  // Restore fetch
  global.fetch = originalFetch;
}

runTest().catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});

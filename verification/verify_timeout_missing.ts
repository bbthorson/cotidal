
import { fetchRandomDrink } from '../src/lib/cocktail-api';
import assert from 'assert';

// Mock global fetch to spy on arguments
const originalFetch = global.fetch;
let lastSignal: AbortSignal | null = null;

global.fetch = async (url, options) => {
  lastSignal = options?.signal as AbortSignal || null;
  return {
    ok: true,
    json: async () => ({ drinks: [] })
  } as Response;
};

async function run() {
  console.log("Verifying fetchRandomDrink timeout signal...");

  await fetchRandomDrink();

  try {
    assert.ok(lastSignal !== null, "Fetch was called without an AbortSignal!");
    console.log("✅ Verification Passed: fetchRandomDrink used an AbortSignal.");
  } catch (e) {
    console.error("❌ Verification Failed:", (e as Error).message);
    process.exit(1);
  } finally {
    global.fetch = originalFetch;
  }
}

run();

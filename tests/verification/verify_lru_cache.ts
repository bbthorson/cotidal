
import { fetchDrinkDetails } from '../../src/lib/cocktail-api';

// Mock fetch
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const fetchMock = async (_url: string | URL | Request, _init?: RequestInit) => {
  return {
    ok: true,
    json: async () => ({
      drinks: [
        {
          idDrink: '123',
          strDrink: 'Test Drink',
          strDrinkThumb: 'http://example.com/img.jpg',
          strInstructions: 'Mix it.'
        }
      ]
    })
  } as Response;
};

global.fetch = fetchMock;

// Spy on fetch to count calls
let fetchCallCount = 0;
const originalFetch = global.fetch;
global.fetch = async (...args) => {
  fetchCallCount++;
  return originalFetch(...args);
};

async function run() {
  console.log('Starting Cache Verification...');

  // 1. Fill the cache (Limit is 100)
  console.log('Filling cache with 100 items...');
  for (let i = 0; i < 100; i++) {
    await fetchDrinkDetails(`drink-${i}`);
  }

  // Reset count to track subsequent calls
  fetchCallCount = 0;

  // 2. Access the first item (`drink-0`) again.
  // In FIFO (current), this does NOT change its position (it remains the "oldest").
  // In LRU (desired), this MOVES it to the end (becomes "newest").
  console.log('Accessing drink-0 (cache hit)...');
  await fetchDrinkDetails(`drink-0`);

  if (fetchCallCount > 0) {
    console.error('ERROR: drink-0 should have been in cache! (This means cache is broken or not working as expected even before overflow)');
    process.exit(1);
  }

  // 3. Insert one more item (`drink-100`) to trigger eviction.
  // In FIFO: `drink-0` (oldest inserted) is evicted.
  // In LRU: `drink-1` (least recently used) is evicted. `drink-0` is safe.
  console.log('Inserting drink-100 (trigger eviction)...');
  await fetchDrinkDetails(`drink-100`);

  // 4. Check if `drink-0` is still in cache.
  fetchCallCount = 0;
  console.log('Checking if drink-0 is still in cache...');
  await fetchDrinkDetails(`drink-0`);

  if (fetchCallCount === 0) {
    console.log('SUCCESS: drink-0 was found in cache (No fetch called). This indicates LRU behavior.');
  } else {
    console.log('FAILURE: drink-0 was NOT in cache (Fetch called). This indicates FIFO behavior (it was evicted).');
    // We exit with 0 here because we EXPECT this to fail initially.
    // The test runner will interpret "FAILURE" log message as the confirmation of current state.
  }
}

run().catch(console.error);

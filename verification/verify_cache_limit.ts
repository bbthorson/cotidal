
import { fetchDrinkDetails, _getCacheSize } from '../src/lib/cocktail-api';

// Mock fetch to avoid network calls and rate limits
global.fetch = async (url: any) => {
  return {
    ok: true,
    json: async () => ({ drinks: [{ idDrink: '1', strDrink: 'Mock', strDrinkThumb: '', strInstructions: '' }] }),
  } as Response;
};

async function verifyCacheLimit() {
  console.log('Starting Cache Limit Verification...');

  const LIMIT = 100;
  const TOTAL_REQUESTS = 150;

  for (let i = 0; i < TOTAL_REQUESTS; i++) {
    await fetchDrinkDetails(`Drink-${i}`);
  }

  const finalSize = _getCacheSize();
  console.log(`Final Cache Size: ${finalSize}`);

  if (finalSize > LIMIT) {
    console.error(`❌ FAILED: Cache size ${finalSize} exceeds limit of ${LIMIT}`);
    process.exit(1);
  } else if (finalSize === 0) {
     console.error(`❌ FAILED: Cache size is 0. Did the calls work?`);
     process.exit(1);
  } else {
    console.log(`✅ PASSED: Cache size ${finalSize} is within limit.`);
  }
}

verifyCacheLimit().catch(err => {
  console.error(err);
  process.exit(1);
});

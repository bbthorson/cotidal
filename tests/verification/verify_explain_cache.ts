
import { getDrinkExplanation, _getCacheSize, _clearCache } from '@/lib/drink-explanation';

const userProfile1 = {
  x: 5,
  y: 5, // Quadrant 1
  dislikesSmoke: false,
  dislikesBitter: false,
};

const userProfile2 = {
  x: -5,
  y: -5, // Quadrant 4 (different key)
  dislikesSmoke: false,
  dislikesBitter: false,
};

// Mock rate limit to avoid headers() error and allow standalone execution
const mockRateLimit = async () => true;

async function main() {
  console.log('--- Starting Verification (Lib) ---');

  // Clear cache to ensure clean state
  _clearCache();
  console.log('Initial cache size:', _getCacheSize()); // Should be 0

  // Call 1
  console.log('Call 1 (Mojito, Profile 1)...');
  const start1 = performance.now();
  // Pass mock rate limit
  const result1 = await getDrinkExplanation('Mojito', userProfile1, mockRateLimit);
  const end1 = performance.now();
  console.log(`Call 1 duration: ${(end1 - start1).toFixed(2)}ms`);

  const sizeAfter1 = _getCacheSize();
  console.log('Cache size after Call 1:', sizeAfter1);
  if (sizeAfter1 !== 1) throw new Error(`Expected cache size 1, got ${sizeAfter1}`);

  // Call 2 (Same args)
  console.log('Call 2 (Mojito, Profile 1) - Should be Cached...');
  const start2 = performance.now();
  const result2 = await getDrinkExplanation('Mojito', userProfile1, mockRateLimit);
  const end2 = performance.now();
  console.log(`Call 2 duration: ${(end2 - start2).toFixed(2)}ms`);

  const sizeAfter2 = _getCacheSize();
  console.log('Cache size after Call 2:', sizeAfter2);
  if (sizeAfter2 !== 1) throw new Error(`Expected cache size 1, got ${sizeAfter2}`);
  if (result1 !== result2) throw new Error('Results do not match');

  // Call 3 (Different Profile)
  console.log('Call 3 (Mojito, Profile 2) - Should be New Key...');
  const start3 = performance.now();
  const result3 = await getDrinkExplanation('Mojito', userProfile2, mockRateLimit);
  const end3 = performance.now();
  console.log(`Call 3 duration: ${(end3 - start3).toFixed(2)}ms`);

  const sizeAfter3 = _getCacheSize();
  console.log('Cache size after Call 3:', sizeAfter3);
  if (sizeAfter3 !== 2) throw new Error(`Expected cache size 2, got ${sizeAfter3}`);

  console.log('--- Verification Passed ---');
}

main().catch(err => {
    console.error('Verification Failed:', err);
    process.exit(1);
});

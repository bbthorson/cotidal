import { getDrinkExplanation, _getCacheSize, _clearCache } from '../../src/lib/drink-explanation';

async function verifyCache() {
  console.log("Starting Cache Verification...");

  // Reset cache
  _clearCache();

  const mockGenerator = async (_prompt: string) => {
    console.log("  [Mock] Generating text...");
    return "This is a mock explanation.";
  };

  const params1 = {
    drinkName: "Old Fashioned",
    x: 5, // Crisp
    y: 5, // Sweet
    dislikesSmoke: false,
    dislikesBitter: false
  };

  // 1. First call - should trigger generation
  console.log("1. Calling getDrinkExplanation (First time)...");
  const result1 = await getDrinkExplanation(params1, mockGenerator);
  console.log(`   Result: ${result1}`);

  if (_getCacheSize() !== 1) {
    throw new Error(`Cache size should be 1, got ${_getCacheSize()}`);
  }
  console.log("   ✅ Cache size increased to 1.");

  // 2. Second call (Same params) - should NOT trigger generation (mock log should not appear)
  console.log("2. Calling getDrinkExplanation (Second time - Same params)...");
  const result2 = await getDrinkExplanation(params1, async () => {
    throw new Error("Should not call generator on cache hit!");
  });
  console.log(`   Result: ${result2}`);

  if (result1 !== result2) {
    throw new Error("Results do not match!");
  }
  console.log("   ✅ Cache hit confirmed (no generation triggered).");

  // 3. Third call (Different X/Y but SAME bucket)
  // x=5 is Crisp. x=8 is also Crisp.
  // y=5 is Sweet. y=2 is also Sweet.
  console.log("3. Calling getDrinkExplanation (Different values, same bucket)...");
  const params2 = { ...params1, x: 8, y: 2 };
  const result3 = await getDrinkExplanation(params2, async () => {
    throw new Error("Should not call generator on bucket hit!");
  });

  if (result3 !== result1) {
    throw new Error("Bucketing failed! Cache should have been hit.");
  }
  console.log("   ✅ Bucket caching confirmed.");

  // 4. Fourth call (Different bucket)
  // x=-5 is Rich.
  console.log("4. Calling getDrinkExplanation (Different bucket)...");
  const params3 = { ...params1, x: -5 };
  await getDrinkExplanation(params3, mockGenerator);

  if (_getCacheSize() !== 2) {
    throw new Error(`Cache size should be 2, got ${_getCacheSize()}`);
  }
  console.log("   ✅ New entry added for different bucket.");

  console.log("All verifications passed!");
}

verifyCache().catch(e => {
  console.error("Verification Failed:", e);
  process.exit(1);
});

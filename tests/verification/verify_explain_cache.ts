import { getDrinkExplanation, _getCacheSize, _clearCache, ExplanationUserProfile } from '@/lib/drink-explanation';
import assert from 'assert';

async function run() {
  console.log("Starting verification for Drink Explanation Caching...");

  // Reset cache
  _clearCache();
  assert.strictEqual(_getCacheSize(), 0, "Cache should be empty initially");

  let callCount = 0;
  const mockGenerator = async (prompt: string) => {
    callCount++;
    console.log("  [Mock AI] Generated text for prompt length:", prompt.length);
    return "Mocked AI Response";
  };

  const profile: ExplanationUserProfile = {
    x: 5,
    y: 5,
    dislikesSmoke: false,
    dislikesBitter: false
  };

  const drinkName = "Aperol Spritz"; // Must be valid drink name in drinkDatabase

  // First call
  console.log("Calling getDrinkExplanation (1st time)...");
  const result1 = await getDrinkExplanation(drinkName, profile, mockGenerator);
  assert.strictEqual(result1, "Mocked AI Response");
  assert.strictEqual(callCount, 1, "Should call generator once");
  assert.strictEqual(_getCacheSize(), 1, "Cache size should be 1");

  // Second call (same inputs)
  console.log("Calling getDrinkExplanation (2nd time)...");
  const result2 = await getDrinkExplanation(drinkName, profile, mockGenerator);
  assert.strictEqual(result2, "Mocked AI Response");
  assert.strictEqual(callCount, 1, "Should NOT call generator again (cached)");
  assert.strictEqual(_getCacheSize(), 1, "Cache size should remain 1");

  // Third call (different inputs)
  console.log("Calling getDrinkExplanation (3rd time - different drink)...");
  const drinkName2 = "Mojito";
  const result3 = await getDrinkExplanation(drinkName2, profile, mockGenerator);
  assert.strictEqual(result3, "Mocked AI Response");
  assert.strictEqual(callCount, 2, "Should call generator again for new key");
  assert.strictEqual(_getCacheSize(), 2, "Cache size should be 2");

  // Fourth call (different profile that maps to different quadrant)
  console.log("Calling getDrinkExplanation (4th time - different quadrant)...");
  const profile2: ExplanationUserProfile = { ...profile, x: -5 }; // Different quadrant
  await getDrinkExplanation(drinkName, profile2, mockGenerator);
  assert.strictEqual(callCount, 3, "Should call generator again for new quadrant");
  assert.strictEqual(_getCacheSize(), 3, "Cache size should be 3");

  // Fifth call (same quadrant but different precise coordinates)
  // Logic quantizes x>0 to 'pos', so x=5 and x=6 should match if y is same.
  console.log("Calling getDrinkExplanation (5th time - same quadrant, diff coord)...");
  const profile3: ExplanationUserProfile = { ...profile, x: 6 }; // Same quadrant as x=5
  await getDrinkExplanation(drinkName, profile3, mockGenerator);
  assert.strictEqual(callCount, 3, "Should NOT call generator for same quadrant");


  console.log("✅ Verification Passed: Caching logic works correctly.");
}

run().catch(err => {
  console.error("❌ Verification Failed:", err);
  process.exit(1);
});

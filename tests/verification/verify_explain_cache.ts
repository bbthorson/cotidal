import { getDrinkExplanation, _getCacheSize, _clearCache, type GeneratorFunction } from '@/lib/drink-explanation';

async function verifyCache() {
    console.log("⚡ Starting Verification: Explain Drink Cache");

    _clearCache();

    const mockProfile = {
        x: 5,
        y: 5,
        dislikesSmoke: false,
        dislikesBitter: false
    };

    let callCount = 0;
    const mockGenerator: GeneratorFunction = async (prompt) => {
        callCount++;
        return `Explanation ${callCount}`;
    };

    // Test 1: Cache Miss
    console.log("\n🧪 Test 1: Initial Call (Cache Miss)");
    const result1 = await getDrinkExplanation("Mojito", mockProfile, mockGenerator);
    if (callCount !== 1) throw new Error(`Expected 1 call, got ${callCount}`);
    if (result1 !== "Explanation 1") throw new Error(`Expected 'Explanation 1', got '${result1}'`);
    if (_getCacheSize() !== 1) throw new Error(`Expected cache size 1, got ${_getCacheSize()}`);
    console.log("✅ Passed");

    // Test 2: Cache Hit
    console.log("\n🧪 Test 2: Subsequent Call (Cache Hit)");
    const result2 = await getDrinkExplanation("Mojito", mockProfile, mockGenerator);
    if (callCount !== 1) throw new Error(`Expected 1 call (no new call), got ${callCount}`);
    if (result2 !== "Explanation 1") throw new Error(`Expected 'Explanation 1', got '${result2}'`);
    console.log("✅ Passed");

    // Test 3: Different Bucket (Cache Miss)
    console.log("\n🧪 Test 3: Different Profile Bucket (Cache Miss)");
    const diffProfile = { ...mockProfile, x: -5 }; // Different quadrant
    const result3 = await getDrinkExplanation("Mojito", diffProfile, mockGenerator);
    if (callCount !== 2) throw new Error(`Expected 2 calls, got ${callCount}`);
    if (result3 !== "Explanation 2") throw new Error(`Expected 'Explanation 2', got '${result3}'`);
    if (_getCacheSize() !== 2) throw new Error(`Expected cache size 2, got ${_getCacheSize()}`);
    console.log("✅ Passed");

    // Test 4: Eviction (Fill Cache)
    console.log("\n🧪 Test 4: Cache Eviction (Max 100)");
    _clearCache();
    callCount = 0; // Reset count

    // Fill with 100 items
    for (let i = 0; i < 100; i++) {
        await getDrinkExplanation(`Drink${i}`, mockProfile, mockGenerator);
    }
    if (_getCacheSize() !== 100) throw new Error(`Expected cache size 100, got ${_getCacheSize()}`);

    // Add 1 more
    await getDrinkExplanation("DrinkOverflow", mockProfile, mockGenerator);
    if (_getCacheSize() !== 100) throw new Error(`Expected cache size 100 (capped), got ${_getCacheSize()}`);

    // Verify Drink0 is evicted (LRU)
    // Drink0 was the first inserted, so it should be gone.
    // Note: getDrinkExplanation returns the generated string.

    // Reset call count to track re-generation
    callCount = 0;

    // Request Drink0 again -> Should trigger generator
    await getDrinkExplanation("Drink0", mockProfile, mockGenerator);
    if (callCount !== 1) throw new Error("Expected Drink0 to be evicted and re-generated");

    console.log("✅ Passed");

    console.log("\n🎉 All Cache Verification Tests Passed!");
}

verifyCache().catch(e => {
    console.error("❌ Verification Failed:", e);
    process.exit(1);
});

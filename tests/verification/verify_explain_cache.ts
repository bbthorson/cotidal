/* eslint-disable @typescript-eslint/no-explicit-any */
import { getDrinkExplanation, _getCacheSize, _clearCache } from '@/lib/drink-explanation';
import assert from 'assert';

const MOCK_DRINK = 'Mojito';
const MOCK_PROFILE = {
    x: 1,
    y: 1,
    dislikesSmoke: false,
    dislikesBitter: false
};

const MOCK_RESPONSE = "The Oracle sees a minty future.";

// Mock generateText
const mockGenerateText = async () => {
    return { text: MOCK_RESPONSE };
};

async function runTest() {
    console.log("Running explanation cache verification...");

    _clearCache();
    assert.strictEqual(_getCacheSize(), 0, "Cache should be empty initially");

    // First call
    console.log("1. Fetching explanation (first time)...");
    const result1 = await getDrinkExplanation(MOCK_DRINK, MOCK_PROFILE, mockGenerateText as any);

    assert.strictEqual(result1, MOCK_RESPONSE, "Should return mocked response");
    assert.strictEqual(_getCacheSize(), 1, "Cache size should be 1");

    // Second call
    console.log("2. Fetching explanation (second time)...");

    // Create a spy to check if called
    let called = false;
    const spyGenerateText = async () => {
        called = true;
        return { text: "SHOULD NOT BE RETURNED" };
    };

    const result2 = await getDrinkExplanation(MOCK_DRINK, MOCK_PROFILE, spyGenerateText as any);

    assert.strictEqual(result2, MOCK_RESPONSE, "Should return cached response");
    assert.strictEqual(called, false, "Should NOT call generateText on cache hit");
    assert.strictEqual(_getCacheSize(), 1, "Cache size should remain 1");

    // Different parameters
    console.log("3. Fetching explanation with different profile...");
    const diffProfile = { ...MOCK_PROFILE, x: -1 }; // Different quadrant

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const result3 = await getDrinkExplanation(MOCK_DRINK, diffProfile, mockGenerateText as any);
    assert.strictEqual(_getCacheSize(), 2, "Cache size should increase for different key");

    console.log("✅ Verification Passed!");
}

runTest().catch(e => {
    console.error("❌ Verification Failed:", e);
    process.exit(1);
});

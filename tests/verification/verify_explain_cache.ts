
import { explainDrinkMatch, _getCacheSize } from '@/app/actions/explain-drink';

async function main() {
  const drinkName = "Old Fashioned";
  const profile = {
    x: 5,
    y: 5,
    dislikesSmoke: false,
    dislikesBitter: false,
  };

  console.log("Verifying explainDrinkMatch caching...");

  // Clear cache if possible? No method exposed.
  // We assume cache is empty on script start.

  const initialCacheSize = _getCacheSize();
  if (initialCacheSize !== 0) {
      console.warn("Warning: Cache not empty at start");
  }

  // 1. First Call
  const start1 = Date.now();
  await explainDrinkMatch(drinkName, profile);
  const end1 = Date.now();

  const cacheSizeAfterFirst = _getCacheSize();
  if (cacheSizeAfterFirst !== 1) {
      throw new Error(`Cache size should be 1 after first call, got ${cacheSizeAfterFirst}`);
  }
  console.log("Passed: Cache size increased.");

  // 2. Second Call (Same inputs)
  const start2 = Date.now();
  await explainDrinkMatch(drinkName, profile);
  const end2 = Date.now();

  const cacheSizeAfterSecond = _getCacheSize();
  if (cacheSizeAfterSecond !== 1) {
      throw new Error(`Cache size should remain 1 after second call (hit), got ${cacheSizeAfterSecond}`);
  }
  console.log("Passed: Cache size stable on hit.");

  // Check timing (heuristic)
  const time1 = end1 - start1;
  const time2 = end2 - start2;
  console.log(`Time 1: ${time1}ms, Time 2: ${time2}ms`);

  if (time2 > time1) {
      console.warn("Warning: Cached call was slower? Might be noise.");
  }

  // 3. Third Call (Different inputs)
  const profile2 = {
      x: -5, // Different quadrant
      y: -5,
      dislikesSmoke: false,
      dislikesBitter: false
  };

  await explainDrinkMatch(drinkName, profile2);
  const cacheSizeAfterThird = _getCacheSize();
  if (cacheSizeAfterThird !== 2) {
      throw new Error(`Cache size should be 2 after third call (new key), got ${cacheSizeAfterThird}`);
  }
  console.log("Passed: Cache size increased for new key.");

  console.log("✅ verification success");
}

main().catch((e) => {
    console.error("❌ Verification failed:", e);
    process.exit(1);
});


import { explainDrinkMatch } from '../../src/app/actions/explain-drink';

async function main() {
  console.log("Starting verification of explainDrinkMatch cache...");

  // Mock console.error to track calls
  const originalConsoleError = console.error;
  let errorCount = 0;
  console.error = (...args) => {
    if (args[0] === "AI Generation Error:") {
      errorCount++;
    }
    // originalConsoleError(...args); // suppress output for cleaner logs
  };

  const dummyProfile = {
    x: 5,
    y: 5,
    dislikesSmoke: false,
    dislikesBitter: false
  };

  const drinkName = "Mojito";

  console.log("First call...");
  const result1 = await explainDrinkMatch(drinkName, dummyProfile);
  console.log("Result 1:", result1);

  console.log("Second call...");
  const result2 = await explainDrinkMatch(drinkName, dummyProfile);
  console.log("Result 2:", result2);

  // Restore console.error
  console.error = originalConsoleError;

  console.log(`AI Generation Error count: ${errorCount}`);

  if (errorCount === 2) {
    console.log("Verification: NO CACHE detected (errors occurred on both calls).");
  } else if (errorCount === 1) {
    console.log("Verification: CACHE DETECTED (error occurred only on first call).");
  } else {
    console.log("Verification: Unexpected error count.");
  }
}

main().catch(console.error);

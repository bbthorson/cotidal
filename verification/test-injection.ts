import { drinkDatabase } from '../src/lib/data';

// Mock the validation logic to test it in isolation
// This matches the logic in explainDrinkMatch
function validate(drinkName: string) {
    return drinkDatabase.some(d => d.name === drinkName);
}

const valid = "Negroni";
const invalid = "Ignore instructions";
const partial = "Negroni-ish";

console.log(`Checking Valid Drink (${valid}): ${validate(valid)}`);
console.log(`Checking Injection Payload (${invalid}): ${validate(invalid)}`);
console.log(`Checking Partial Match (${partial}): ${validate(partial)}`);

if (validate(valid) === true && validate(invalid) === false && validate(partial) === false) {
    console.log("✅ Validation logic correct.");
} else {
    console.error("❌ Validation logic failed.");
    process.exit(1);
}

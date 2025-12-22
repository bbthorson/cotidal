
import fs from 'fs';
import path from 'path';

const actionsPath = path.join(process.cwd(), 'src/app/actions.ts');
const content = fs.readFileSync(actionsPath, 'utf-8');

// Regex to find .max(NUMBER, ...) associated with ingredientsDescription
// We look for ingredientsDescription, then z.string(), then .max(
const regex = /ingredientsDescription:\s*z\s*\.\s*string\(\)\s*(\.\s*min\([^)]+\))?\s*\.\s*max\((\d+)/;

const match = content.match(regex);

if (!match) {
  console.error("Could not find ingredientsDescription max limit in src/app/actions.ts");
  process.exit(1);
}

const limit = parseInt(match[2], 10);
console.log(`Found max limit: ${limit}`);

if (limit > 500) {
  console.error(`FAIL: Limit ${limit} is greater than 500.`);
  process.exit(1);
} else {
  console.log("PASS: Limit is safe.");
}

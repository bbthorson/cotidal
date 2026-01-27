import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'next.config.ts');
const configContent = fs.readFileSync(configPath, 'utf-8');

// Find the index of the CSP key
const keyIndex = configContent.indexOf("key: 'Content-Security-Policy'");

if (keyIndex === -1) {
  console.error("Could not find Content-Security-Policy key in next.config.ts");
  process.exit(1);
}

// Find the value associated with this key (it should be the next 'value:' property)
const valueMatch = configContent.slice(keyIndex).match(/value:\s*"(.*)"/);

if (!valueMatch) {
  console.error("Could not find value for Content-Security-Policy");
  process.exit(1);
}

const cspValue = valueMatch[1];
console.log("Found CSP:", cspValue);

if (cspValue.includes("'unsafe-eval'")) {
  console.error("FAIL: CSP contains 'unsafe-eval'!");
  process.exit(1);
} else {
  console.log("PASS: CSP does not contain 'unsafe-eval'.");
  process.exit(0);
}

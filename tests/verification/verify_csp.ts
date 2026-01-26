
import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'next.config.ts');
const configContent = fs.readFileSync(configPath, 'utf-8');

// Helper to extract CSP string
const cspMatch = configContent.match(/Content-Security-Policy',\s*value:\s*"(.*?)"/s);

if (!cspMatch) {
  console.error("❌ Could not find Content-Security-Policy in next.config.ts");
  process.exit(1);
}

const csp = cspMatch[1];
console.log("Found CSP:", csp);

// Checks
const requiredDomains = [
  'https://identitytoolkit.googleapis.com',
  'https://securetoken.googleapis.com',
  'https://firebaselogging.googleapis.com',
  'https://*.googleusercontent.com'
];

const forbiddenDirectives = [
  "'unsafe-eval'"
];

let failed = false;

requiredDomains.forEach(domain => {
  if (!csp.includes(domain)) {
    console.error(`❌ CSP is missing required domain: ${domain}`);
    failed = true;
  } else {
    console.log(`✅ CSP contains ${domain}`);
  }
});

forbiddenDirectives.forEach(directive => {
  if (csp.includes(directive)) {
    console.error(`❌ CSP contains forbidden directive: ${directive}`);
    failed = true;
  } else {
    console.log(`✅ CSP does not contain ${directive}`);
  }
});

if (failed) {
  console.error("FAILED: CSP verification failed.");
  process.exit(1);
} else {
  console.log("SUCCESS: CSP verification passed.");
}

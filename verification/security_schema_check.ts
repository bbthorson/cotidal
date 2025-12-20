import { z } from 'zod';

// 1. REPLICATE VULNERABLE STATE
const VulnerableSchema = z.object({
  ingredientsDescription: z
    .string()
    .describe("A description of the ingredients the user has available."),
});

// 2. REPLICATE SECURE STATE
const SecureSchema = z.object({
  ingredientsDescription: z
    .string()
    .max(500)
    .describe("A description of the ingredients the user has available."),
});

const longString = 'a'.repeat(5000);

console.log("--- TEST START ---");

// Test Vulnerable
const vResult = VulnerableSchema.safeParse({ ingredientsDescription: longString });
if (vResult.success) {
  console.log("✅ [CONFIRMED] Vulnerable Schema accepted 5000 chars.");
} else {
  console.error("❌ [UNEXPECTED] Vulnerable Schema rejected input.");
}

// Test Secure
const sResult = SecureSchema.safeParse({ ingredientsDescription: longString });
if (!sResult.success) {
  console.log("✅ [CONFIRMED] Secure Schema rejected 5000 chars.");
  console.log("Error:", sResult.error.issues[0].message);
} else {
  console.error("❌ [FAILED] Secure Schema accepted input! Fix is not working.");
}

console.log("--- TEST END ---");

# Sentinel's Journal

## 2025-12-14 - Adding Security Headers & Strengthening Build Process
**Vulnerability:** Missing HTTP Security Headers (X-Content-Type-Options, etc.) and build process ignoring lint/type errors.
**Learning:** The project was configured to ignore TypeScript and ESLint errors during build (`ignoreBuildErrors: true`, `ignoreDuringBuilds: true`). This is a bad practice as it allows broken or insecure code to deploy. Also, standard security headers were missing.
**Prevention:** Enforced strict build checks and added a comprehensive `headers()` configuration in `next.config.ts`.

## 2025-05-23 - Preventing Prompt Injection in AI Server Action
**Vulnerability:** The `explainDrinkMatch` Server Action accepted an arbitrary `drinkName` string and interpolated it directly into the AI prompt. A malicious actor could invoke this action with instructions to bypass the AI's persona or leak information.
**Learning:** Server Actions are public endpoints. Even if the UI controls the input, an attacker can send any data. AI inputs must be treated as "Untrusted Source" data, similar to SQL queries.
**Prevention:** Implemented a strict whitelist validation. The `drinkName` input is now checked against the static `drinkDatabase`. If the drink is not known, the action returns a safe fallback immediately, preventing the potentially malicious string from reaching the LLM.

## 2025-05-24 - Input Validation for Complex Objects in Server Actions
**Vulnerability:** The `explainDrinkMatch` Server Action accepted `userProfile` as `any` (implicitly) and accessed properties blindly. While mostly harmless due to boolean logic, it exposed the application to unexpected input structures and potential future vulnerabilities if the object usage expanded.
**Learning:** Server Actions receiving complex objects should strictly validate the shape of that object using a schema (like Zod) before use, rather than relying on TypeScript types which disappear at runtime.
**Prevention:** Added Zod schema validation for `UserProfile` in `explain-drink.ts` to ensure runtime integrity of the data passed to the AI prompt logic.

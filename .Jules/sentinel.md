# Sentinel's Journal

## 2025-12-21 - Aligning Input Limits Across Layers
**Vulnerability:** Inconsistent input validation limits between the public Server Action `findCocktailRecipes` (1000 chars) and the internal AI flow `ingredientBasedCocktailSearch` (500 chars).
**Learning:** Defense in depth requires consistent validation. If the public gateway allows more data than the internal service handles, it creates a "Validation Gap" where requests fail deeply in the stack (wasting resources) rather than being rejected immediately.
**Prevention:** Reduced the Zod limit in `src/app/actions.ts` to 500 characters to match the internal constraint, ensuring early rejection of invalid payloads.

## 2025-12-14 - Adding Security Headers & Strengthening Build Process
**Vulnerability:** Missing HTTP Security Headers (X-Content-Type-Options, etc.) and build process ignoring lint/type errors.
**Learning:** The project was configured to ignore TypeScript and ESLint errors during build (`ignoreBuildErrors: true`, `ignoreDuringBuilds: true`). This is a bad practice as it allows broken or insecure code to deploy. Also, standard security headers were missing.
**Prevention:** Enforced strict build checks and added a comprehensive `headers()` configuration in `next.config.ts`.

## 2025-05-23 - Preventing Prompt Injection in AI Server Action
**Vulnerability:** The `explainDrinkMatch` Server Action accepted an arbitrary `drinkName` string and interpolated it directly into the AI prompt. A malicious actor could invoke this action with instructions to bypass the AI's persona or leak information.
**Learning:** Server Actions are public endpoints. Even if the UI controls the input, an attacker can send any data. AI inputs must be treated as "Untrusted Source" data, similar to SQL queries.
**Prevention:** Implemented a strict whitelist validation. The `drinkName` input is now checked against the static `drinkDatabase`. If the drink is not known, the action returns a safe fallback immediately, preventing the potentially malicious string from reaching the LLM.

## 2025-05-24 - DoS Prevention on AI Search Input
**Vulnerability:** The `ingredientBasedCocktailSearch` flow (a public Server Action) accepted unbounded string input for `ingredientsDescription`.
**Learning:** Zod's `z.string()` defaults to no length limit. On public AI endpoints, this allows attackers to send massive payloads (megabytes of text), causing Denial of Service or exhausting AI token budgets.
**Prevention:** Added `.max(500)` to the Zod schema for the search input and `.max(100)` for the internal tool input. Always enforcing length limits on string inputs for public endpoints is mandatory.

## 2025-05-25 - Rate Limiting AI Server Actions
**Vulnerability:** Publicly accessible Server Actions (`findCocktailRecipes`, `explainDrinkMatch`) triggering expensive AI operations lacked rate limiting, exposing the application to Denial of Service (DoS) and excessive cost from API abuse.
**Learning:** While robust global rate limiting requires shared state (e.g., Redis), a per-instance in-memory rate limiter provides a critical "Defense in Depth" layer. It prevents simple flooding attacks on a single container without introducing complex infrastructure dependencies.
**Prevention:** Implemented a `checkRateLimit` utility using `next/headers` to track IP-based usage in memory and applied it to all AI-driven Server Actions.

## 2025-05-26 - Timeout Enforcement on External API Calls
**Vulnerability:** External `fetch` calls to TheCocktailDB in `cocktail-api.ts` and `ingredient-based-cocktail-search.ts` lacked timeouts.
**Learning:** Node.js `fetch` (and polyfills) typically have no default timeout. If the upstream service hangs or becomes unresponsive, the serverless function can hang until its hard limit, consuming concurrent execution slots and potentially causing a Denial of Service (DoS) for the entire application.
**Prevention:** Implemented a strict 5000ms timeout using `AbortController` for all external API requests. This ensures resources are freed quickly even if the third-party service fails.

## 2025-05-27 - Preventing Prompt Injection via System Instructions
**Vulnerability:** The `archetypeDrink` Server Action mixed system instructions ("You are The Oracle...") with user input ("Analyze: ${drinkName}") in a single text prompt. This allowed potential Prompt Injection where malicious input could override the AI's persona or logic.
**Learning:** Reliance on the model to "behave" when instructions and data are concatenated is fragile. Modern LLM APIs and SDKs (like Vercel AI SDK) support a distinct `system` parameter effectively creating a "sandbox" for the persona that user input cannot easily override.
**Prevention:** Refactored `src/app/actions/archetype-drink.ts` to move the persona and rules into the `system` property, leaving the `prompt` property exclusively for the user-provided drink data.

## 2025-05-28 - CSP Configuration Gap with External Auth Services
**Vulnerability:** The Content Security Policy (CSP) in `next.config.ts` was configured to block all external connections except TheCocktailDB, effectively breaking the application's Firebase Authentication which relies on Google's identity domains. Additionally, `script-src` allowed `'unsafe-eval'`.
**Learning:** CSPs must be tested against the full runtime behavior of the application, including third-party SDKs (like Firebase) that perform client-side network requests to their own domains. A "strict" CSP that blocks essential services is functionally a denial of service. Also, `unsafe-eval` is rarely needed in modern Next.js production builds and weakens XSS protection.
**Prevention:** Updated `next.config.ts` to whitelist specific Firebase/Google domains (`identitytoolkit.googleapis.com`, etc.) and removed `'unsafe-eval'` to align with security best practices without breaking functionality.

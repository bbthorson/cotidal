## 2025-05-27 - Securing Internal AI Actions
**Vulnerability:** The `archetypeDrink` Server Action was exposed as a public endpoint (`'use server'`) without input validation, allowing potential prompt injection and resource exhaustion.
**Learning:** Functions that are intended for internal use (e.g., by other Server Actions) should not be marked with `'use server'` themselves. This inadvertently creates a public API surface. Additionally, even internal helpers handling AI or expensive operations should validate inputs ("Defense in Depth").
**Prevention:** Removed `'use server'` from `archetype-drink.ts` to make it a private module. Added Zod validation to its inputs. Also secured the public caller `getInjectedDrinks` with rate limiting and strict loop bounds.

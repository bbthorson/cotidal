## 2024-05-23 - Server Action Logic Extraction
**Learning:** To enable unit testing and state verification (like cache size) for Server Actions, the business logic must be extracted to a separate `src/lib/` module.
**Context:** Next.js Server Actions (`'use server'`) restrict exports to async functions. This makes it impossible to export synchronous helper functions (like `_getCacheSize` or `_clearCache`) for testing purposes from the same file.
**Action:** Always extract the implementation of a Server Action to a `src/lib/` file. The Server Action itself should act as a thin controller layer (validation, rate limiting) that delegates to the library function.

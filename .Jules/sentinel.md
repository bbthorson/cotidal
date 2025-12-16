# Sentinel's Journal

## 2025-12-14 - Adding Security Headers & Strengthening Build Process
**Vulnerability:** Missing HTTP Security Headers (X-Content-Type-Options, etc.) and build process ignoring lint/type errors.
**Learning:** The project was configured to ignore TypeScript and ESLint errors during build (`ignoreBuildErrors: true`, `ignoreDuringBuilds: true`). This is a bad practice as it allows broken or insecure code to deploy. Also, standard security headers were missing.
**Prevention:** Enforced strict build checks and added a comprehensive `headers()` configuration in `next.config.ts`.

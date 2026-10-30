# Technology Stack

The current stack, kept in step with `package.json`. README.md has the same
table with links; AGENTS.md has the architecture.

## Core Framework
- **Framework:** Astro 7, server output, on Cloudflare Workers (`@astrojs/cloudflare`)
- **Language:** TypeScript
- **Runtime:** Node.js >= 22 for tooling (`.nvmrc`); workerd in production

## Frontend & UI
- **Rendering:** static Astro for `/`, `/drinks`, `/regions/<id>` and `/p/<handle>`; React 19 islands on the app pages only (`/radio`, `/compass`, `/log`, `/harbour`, `/questions`, `/rate`)
- **Styling:** Tailwind CSS, tokens in `src/styles/globals.css` (docs/design-system.md)
- **Component primitives:** `@radix-ui/react-dialog` (the sign-in sheet)
- **Validation:** Zod

## AI & Data
- **Model:** Cloudflare Workers AI through AI Gateway, one model id in `src/lib/generation.ts` (docs/generation.md)
- **Identity and records:** AT Protocol (`@bbthorson/atproto-cf-auth`, `@atproto/api`), lexicons in `src/lib/atproto/lexicons/`
- **Local data:** `src/lib/data.ts` (positions on the map), `src/content/drinks/` (register prose)

## Development Tools
- **Package Manager:** npm (`package-lock.json`)
- **Linting:** ESLint, including the design-token rules
- **Testing:** Playwright (unit and browser), run against the preview build

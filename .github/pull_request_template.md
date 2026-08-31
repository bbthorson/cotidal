## What this changes

<!-- One or two sentences. What is different once this merges? -->

## Why

<!-- The problem, not the solution. -->

## Single sources of truth

The recurring failure in this codebase is a second, hand-maintained copy of
something that drifts from the first, and every instance so far has failed
*silently*. Tick what applies; delete the rest.

- [ ] **Records** — lexicon JSON is the truth, and `npm run lexicons` passes
- [ ] **Styling** — tokens added to `globals.css` / `tailwind.config.ts` *before* being used
- [ ] **Copy** — user-facing strings live in `src/lib/copy.ts`, not in components
- [ ] **Drinks** — content entries join to `drinkDatabase` by name; no coordinates in frontmatter

## Rendering

- [ ] No island added to `/` or `/drinks` — both ship zero client JavaScript

## Checks

- [ ] `npm run check`
- [ ] `npx playwright test`

## Screenshots

<!-- Anything user-facing. Before and after, if you changed something that already existed. -->

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
- [ ] **Copy** — user-facing strings live in `src/lib/copy/`, not in components
- [ ] **Drinks** — content entries join to `drinkDatabase` by name; no coordinates in frontmatter

## Rendering

- [ ] No island added to `/`, `/drinks/<slug>` or `/p/<handle>` — they ship zero client JavaScript
- [ ] `/sign-in` still works with JavaScript off

## Docs

- [ ] Docs describing what changed are updated in this PR, in the one place each topic lives (`README.md`, Docs)

## Checks

- [ ] `npm run check`
- [ ] `npm test`

## Screenshots

<!-- Anything user-facing. Before and after, if you changed something that already existed. -->

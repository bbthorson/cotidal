# Agent Context: The Crystal Coupe

Architecture notes for anyone — human or agent — working in this codebase.
Product reasoning lives in `docs/data-model.md` and `docs/brand.md`; this file
is about the code.

## Rendering: keep the front door static

`/` is pure Astro with **zero client JavaScript**. `/taste` is the only route
that mounts a React island.

The whole app was previously one `client:only` island, so nothing painted
until ~860 KB of JavaScript had downloaded and hydrated — on every route,
landing page included. Astro was being used as a slower Next.js.

- Prefer `.astro` for anything without state. Reach for an island only when
  something genuinely needs to be interactive, and scope it tightly.
- Prefer `client:load` over `client:only` so the shell server-renders.
- Never add an island to `/`. `tests/landing-static.spec.ts` fails if you do.
- Sign-in is content-negotiated (`src/pages/api/auth/atproto/login.ts`): JSON
  in, JSON out for the island; form-encoded in, 303 out for the plain form.
  Do not break the second path — it is what keeps `/` script-free.

## Single sources of truth

The recurring failure in this codebase is a second, hand-maintained copy of
something that drifts from the first. Three had already happened:

| Layer | Truth | How drift is caught |
|---|---|---|
| Records | `src/lib/atproto/lexicons/*.json` | `npm run lexicons` |
| Styling | `globals.css` tokens + `tailwind.config.ts` | *(convention — lint pending)* |
| Marketing copy | `src/lib/copy.ts` | *(convention)* |

Found in the wild, each silent:

- `lexicon.ts` and `drinkLog.json` described different records — the Zod
  schema had six fields the lexicon did not, and made a required field
  optional.
- `text-2xs` / `text-3xs` were used 41 times and defined nowhere, so those
  elements rendered at inherited size.
- `font-body` / `font-serif` / `font-condensed` pointed at `--font-*`
  variables that did not exist, so all three Google Fonts loaded and none
  applied.

Add a field to a lexicon before using it, a token before styling with it, and
a string to `copy.ts` before rendering it.

## Key modules

### Palate map — `src/lib/data.ts`, `src/components/app/ResultsScreen.tsx`
2D plane. Users and drinks both carry `x` (Rich −10 → Crisp +10) and `y`
(Savory −10 → Sweet +10). Euclidean distance gives the raw match; `VibeTag`s
sort within it; context re-weights on top.

**Your dot stays put.** Changing context changes the map around the user, not
the user.

### Elicitation — `belief-state.ts`, `question-selector.ts`, `useDiscoveryQuiz.ts`
`belief-state` holds per-axis estimates and confidence; the selector picks the
question that reduces the most uncertainty. **Only the first three questions
are fixed** — never hard-code a path through the quiz in a test.
`useBartenderChat` is entirely local canned copy, so the flow runs offline.

### AT Protocol — `src/lib/atproto/`
- `lexicons/*.json` — schemas (authoritative)
- `records.ts` — Zod for `pour`, `menu`, `recipe`, `venue`, `maker`, `defs`
- `lexicon.ts` — legacy `palate` and `drinkLog`, being migrated onto `pour`
- `client.ts`, `session-store.ts`, `publish.ts` — OAuth and writes

Records are signed by their authors and **never rewritten**. Reconciling an
unclaimed reference to a later account is the app view's job.

## Conventions

- Test the contract, not the path. Order-independent logic (scoring, belief
  state) belongs in unit tests; browser tests cover routing, rendering, and
  degradation.
- Mock model boundaries in tests. The suite must pass with no API key.
- `npm` is the package manager — `package-lock.json` is the lockfile.

## Vocabulary

"Triangulation", "Calibration", "Architecture", "Context" are **internal**
names for the algorithm. They are accurate here and must not appear in the
interface; see `docs/brand.md`.

## Roadmap

1. **Namespace.** `app.crystalcoupe.*` is a placeholder until a domain is
   registered — NSID authority comes from the reversed domain.
2. **Migrate `drinkLog` → `pour`**, then delete the legacy lexicon.
3. **Lint the token rules** so items 2 and 3 above stop being conventions.
4. **Menu capture.** Photograph a menu, get a recommendation, no account
   required — value before signup, and it builds the venue/menu corpus as a
   byproduct.
5. **Rework elicitation.** Swipes for breadth, forced-choice pairs for
   precision, the 9-point hedonic for post-drink feedback. Never swipe on
   drink *names* — that measures familiarity, not taste.
6. **The Overlap.** Two people in the same bar, conversation starters from
   what their maps share. Surface only the intersection; lead with
   disagreement about drinks.

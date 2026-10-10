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
- Sign-in is `@bbthorson/atproto-cf-auth`, content-negotiated at
  `/api/auth/atproto/login`: JSON in, JSON out for the island; form-encoded in,
  303 out for the plain form.
  Do not break the second path — it is what keeps `/` script-free.

## Single sources of truth

The recurring failure in this codebase is a second, hand-maintained copy of
something that drifts from the first. Three had already happened:

| Layer | Truth | How drift is caught |
|---|---|---|
| Records | `src/lib/atproto/lexicons/*.json` | `npm run lexicons` |
| Styling | `globals.css` tokens + `tailwind.config.ts` | `npm run lint` — arbitrary values and raw colours are an error in `pages/`, `layouts/` and `components/marketing/` |
| Marketing copy | `src/lib/copy.ts` | *(convention)* |
| Drink prose | `src/content/drinks/*.md` | `tests/drink-content.spec.ts` |

Found in the wild, each silent:

- `lexicon.ts` and `drinkLog.json` described different records — the Zod
  schema had six fields the lexicon did not, and made a required field
  optional.
- `text-2xs` / `text-3xs` were used 41 times and defined nowhere, so those
  elements rendered at inherited size.
- `font-body` / `font-serif` / `font-condensed` pointed at `--font-*`
  variables that did not exist, so all three Google Fonts loaded and none
  applied.

- Six of the `recommendedDrinks` in `archetypes.ts` named drinks that were not
  in `drinkDatabase` at all, so the `agave-smoke` archetype recommended four
  drinks the app could neither map nor score.

Add a field to a lexicon before using it, a token before styling with it, and
a string to `copy.ts` before rendering it.

## Key modules

### Palate map — `src/lib/data.ts`, `src/components/app/ResultsScreen.tsx`
2D plane. Users and drinks both carry `x` (Rich −10 → Crisp +10) and `y`
(Savory −10 → Sweet +10). Euclidean distance gives the raw match; `VibeTag`s
sort within it; context re-weights on top.

**Your dot stays put.** Changing context changes the map around the user, not
the user.

### Psychophysical State & EKF — `src/lib/palate-state.ts`
Models longitudinal taste preference drift via an Extended Kalman Filter (EKF).
The 5D latent state vector ($\mathbf{x}_k \in \mathbb{R}^5$) is `StateVector`:
Rich-Crisp, Savory-Sweet, Bitter Tolerance, Tannin Tolerance and Complexity,
accompanied by error covariance matrix ($\mathbf{P}_k$). Observations are
normalised for Sensory-Specific Satiety (SSS exponential volume decay) and
prandial ghrelin before they reach the filter. Detailed psychophysics in
`docs/sensory-science.md`; the order of the axes is also the order of
`latentVector` in `app.crystalcoupe.palate.json`.

An axis learns only if `predictHedonic` reads it — otherwise its Jacobian
entry is zero and so is its gain. Every drink-side input to that function is
derived from `Drink` (see `complexityDemand`), never stored alongside it.

The dot on the map is not the filter's estimate: `applyPour` moves crisp/sweet
by a capped, simpler rule and leaves the other three axes to the EKF.

### Elicitation — `belief-state.ts`, `question-selector.ts`, `useDiscoveryQuiz.ts`
`belief-state` holds per-axis estimates and confidence; the selector picks the
question that reduces the most uncertainty. **Only the first three questions
are fixed** — never hard-code a path through the quiz in a test.
`useBartenderChat` is entirely local canned copy, so the flow runs offline.
What may call a model, and who sees the result, is `docs/generation.md`.

### Drink prose — `src/content/drinks/`, `src/content.config.ts`
An Astro content collection behind `/drinks`, prerendered and script-free.

Two rules make it safe to grow. **Frontmatter carries no coordinates** — an
entry joins to `drinkDatabase` by `name`, so the map stays the one place a
drink's position is defined. And **`documented` may not be empty**: the format
separates what is attested from what is merely repeated, which is the whole
reason the register exists rather than being a set of encyclopedia entries.

Prose is written from primary sources rather than adapted from any one
reference, so no entry inherits a share-alike licence.

`/drinks` groups entries under the four regions, and each section carries its
quadrant `id` as an anchor because the landing page links into them
(`/drinks#ember`). Those are two hand-written lists of the same ids;
`tests/landing-static.spec.ts` asserts they still agree.

**To add an entry**, create `src/content/drinks/<slug>.md`. The filename is the
URL. `name` in the frontmatter must match a `name` in `drinkDatabase` exactly —
including the parenthetical, as in `Daiquiri (Classic)`. `family` is a closed
enum in `src/content.config.ts`; extend it there before using a new value. Then:

```bash
npm run typecheck   # the frontmatter schema is checked at build time
npx playwright test tests/drink-content.spec.ts
```

Wikipedia is a fine index for finding the primary sources. It is not itself a
source: follow it out to the bar manual, the newspaper, or the archive, cite
that, and write the prose yourself. Its text is CC BY-SA, so close paraphrase
would attach a share-alike obligation to the entry.

### AT Protocol — `src/lib/atproto/`
- `lexicons/*.json` — schemas (authoritative)
- `records.ts` — Zod for `pour`, `menu`, `recipe`, `venue`, `maker`, `defs`
- `lexicon.ts` — legacy `palate` and `drinkLog`, being migrated onto `pour`
- `auth.ts`, `paths.ts`, `publish.ts` — sign-in (`@bbthorson/atproto-cf-auth`)
  and writes
- `session.ts` — the `bsky_sid` cookie is an opaque id into a sealed
  server-side store; `oauthSession()` is the authorisation. Anything billed or
  destructive gates on `restoredDid()`.

**Bindings come from `cloudflare:workers` via `src/lib/runtime.ts`, never from
`locals.runtime.env`** — that getter throws in Astro v6+, so an optional chain
does not protect you. It fails loudly in production and silently in dev.

**`SESSION_SECRET` is a Worker secret** (`wrangler secret put SESSION_SECRET`,
32+ random characters) and seals everything the auth package stores. Unset on
Workers, sign-in is disabled. The package runs on Web Crypto and `fetch` only,
so it needs neither `@atproto/oauth-client-node` nor its undici-based handle
resolver, which threw in the constructor on workerd. In development open the
app at `http://127.0.0.1:9002`, not `localhost`.

Records are signed by their authors and **never rewritten**. Reconciling an
unclaimed reference to a later account is the app view's job.

## Conventions

- Test the contract, not the path. Order-independent logic (scoring, belief
  state) belongs in unit tests; browser tests cover routing, rendering, and
  degradation.
- Model routes are gated, metered, and always answer with usable content —
  session gate, per-DID limiter, deterministic fallback, `x-generation` header.
  A new one inherits all four (`docs/generation.md`).
- Mock model boundaries in tests. The suite must pass with no API key.
- `npm` is the package manager — `package-lock.json` is the lockfile.
- In Claude Code on the web, `.claude/hooks/session-start.sh` installs
  dependencies and sets the env vars the suite needs there. Run the suite the
  way CI does, against the preview build: `npm run build && CI=1 npx
  playwright test`. Against `npm run dev`, server rendering throws "The
  Console.createTask method is not implemented" (React 19's dev build on
  workerd) and about a third of the suite fails.

## Vocabulary

"Triangulation", "Calibration", "Architecture", "Context" are **internal**
names for the algorithm. They are accurate here and must not appear in the
interface; see `docs/brand.md`.

## Roadmap

1. **Namespace.** `app.crystalcoupe.*` is a placeholder until a domain is
   registered — NSID authority comes from the reversed domain.
2. **Migrate `drinkLog` → `pour`** *(Completed)*. Clean-slate implementation
   with 5D EKF dynamic state, gLMS hedonic ratings, CATA volatile descriptors,
   and prandial satiety normalization. Legacy `drinkLog` replaced by `pour`.
3. **Carry the palette into `/taste`.** The inversion onto paper landed on `/`
   and `/drinks`; the app route still has ~38 hard-coded colours in
   `src/components/app/`, which the token rule reports as warnings rather than
   errors. Until those are tokens, that route is paper chrome over components
   that assume a dark ground.
4. **Menu capture.** Photograph a menu, get a recommendation, no account
   required — value before signup, and it builds the venue/menu corpus as a
   byproduct.
5. **Region pages** (`/regions/<id>`). The landing page's four regions now
   link into `/drinks`; a real page per region is the reading path proper.
   Content-led — same sourcing discipline as `src/content/drinks/`.
6. **The return visit.** Logging a pour and watching the point move is the
   only recurring behaviour in the product and has no front door.
7. **Venue claim and menu publishing.** Handle-as-domain makes claiming and
   publishing the same act; the lexicons exist and nothing renders them.
8. **Rework elicitation.** Swipes for breadth, forced-choice pairs for
   precision, the 9-point hedonic for post-drink feedback. Never swipe on
   drink *names* — that measures familiarity, not taste.
9. **The Overlap.** Two people in the same bar, conversation starters from
   what their maps share. Discovery comes from the user's existing follow
   graph, not a second one built here. Surface only the intersection; lead
   with disagreement about drinks.

Sequencing and the reasoning behind it: `docs/routes.md`.

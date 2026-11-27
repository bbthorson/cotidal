# Agent Context: Cotidal

How the code is laid out and the rules it keeps. Product reasoning is in
`docs/`; each file opens with front matter (`summary`, `read_when`), so read
those first (`head -5 docs/*.md`) and open a doc only when its `read_when`
matches the task. Each topic has one home: link to it, don't repeat it.

## Rendering

Every page is the map and its card (`MapScreen.tsx`; `docs/design-system.md`,
One kind of page). A page with no script renders it from `MapPage.astro`, on
the server with no directive, so there is one copy of the map. The one React
island is `/map` (`client:load`, never `client:only`, so it server-renders).

- **No client JavaScript** on `/`, `/drinks/<slug>`, `/p/<handle>` and the
  other static pages. Never add an island to `/`:
  `tests/landing-static.spec.ts` fails. `/` is the front door only for
  someone with nothing on the map: a member, or a device whose presence
  cookie says it holds a coordinate (`src/lib/device-presence.ts`), gets
  `/map` there by `Astro.rewrite`, decided on the server. Any parameter keeps
  the front door (`frontDoorHref`; `tests/front-door.spec.ts`).
- `/sign-in` is a plain form post that works with JavaScript off, enhanced by
  `<bsky-sign-in>` (no React). Sign-in (`@bbthorson/atproto-cf-auth`) is
  content-negotiated at `/api/auth/atproto/login`: JSON in, JSON out for the
  island; form-encoded in, 303 out for the plain form (including `signUp=1`).
  Don't break the second path.
- The questions are a state of the map's card (`/map?quiz=1`,
  `QuizCard.tsx`), never a page. Rating a pour is in the card too
  (`RatePanel.tsx`, `useRateSheet`; `?rate=<drink>` or `?draft=1&…` opens it
  once; a new trigger calls `open()` and does not navigate). The URL contract
  is `docs/design-system.md`, Rating a pour.
- The account control is server truth (`accountFor`): `@handle` for a
  member, Sign in for a guest, Account on a prerendered page. Sign out is on
  `/settings` alone and lands on `/map?signed_out=1`, where
  `AtprotoProvider` clears the device's palate but keeps remembered accounts.
- **An app screen is a hook and a drawing.** Hooks in `src/hooks/`
  (`useExplore`, `useMemberData`, `useQuizOverlay`, `useRatePour`,
  `usePourForm`, `useSignIn`) hold state and what a tap does; components only
  draw it. Rules are plain functions in `src/lib/<domain>/`, tested in
  `tests/unit/`. `src/lib/` imports nothing from `hooks/` or `components/`;
  `hooks/` imports nothing from `components/`.
- **Member API:** one bootstrap read, `GET /api/me` (`useMemberData`); writes
  at `POST /api/me/palate`, `/api/me/elicitation`, `/api/me/pours`. A guest's
  palate and quiz run on the device. Server pages call `src/lib/` directly
  (`src/lib/pages/*.server.ts`). Outside clients read through `/mcp`.
- **Staged, unwired capabilities** (tested, no UI calls them yet):
  `src/pages/api/explain-drink.ts`, `src/lib/drinks/menu-audit.ts`,
  `src/lib/drinks/venue-analytics.ts`, `src/lib/atproto/spaces.ts`.

## Single sources of truth

The recurring failure here is a second, hand-kept copy that drifts from the
first, silently.

| Layer | Truth | Drift is caught by |
|---|---|---|
| Records | `src/lib/atproto/lexicons/*.json` | `npm run lexicons` |
| Styling | `globals.css` tokens + `tailwind.config.ts` | `npm run lint`: arbitrary values, raw colours, opacity modifiers and Tailwind's own type sizes are errors in `pages/`, `layouts/`, `components/` |
| Interface copy | `src/lib/copy/` | `npm run lint`: words in JSX text or a literal `placeholder` / `aria-label` / `title` / `alt` are errors. Exceptions: quiz questions (`palate/discovery-questions.ts`, beside their scoring) and the drink and region prose |
| Drink prose | `src/content/drinks/*.md` | `tests/unit/drink-content.test.ts` |
| Region prose | `src/content/regions/*.md` | `tests/unit/region-content.test.ts` |
| What the device keeps | `src/lib/device-store.ts` | convention: nothing else touches `localStorage` or the presence cookie (`device-presence.ts`: `1` or absent, never the coordinate) |
| Icons and share cards | `src/lib/mark.ts`, `src/pages/share/[card].astro`; `npm run images` writes `public/` | `tests/unit/mark.test.ts`, `tests/unit/share.test.ts` |

Add a field to a lexicon before using it, a token before styling with it,
and a string to `copy/` before rendering it. A new font size goes in
`tailwind.config.ts` **and** `FONT_SIZES` in `src/lib/utils.ts`.

## Key modules

### The map — `src/lib/drinks/data.ts`, `Explore.tsx`, `PalateMap.tsx`

A 2D plane: `x` Rich −10 → Crisp +10, `y` Savory −10 → Sweet +10. `/map` is
the app's one screen: the map fixed as the background, never panning or
zooming (what changes is what is drawn), and one card for everything else.
Geometry, contours and label placement are plain functions (`map-draw.ts`);
the map is an SVG in map units with HTML marks over it in percentages, so the
server draws it whole. The library is always larger than the map: a view
draws the staples or a filter's own drinks, never all of them
(`drawnDrinks`, `src/lib/map/drawn.ts`). Screen and card behaviour: `docs/design-system.md`.

**The address** (`src/lib/map/map-url.ts`): the path picks the card, the
parameters pick what the map draws (`drink=`, `palate=`, `with=`, `region=`).
Read and write them only through `readMapView` and `viewHref`. A drink is
checked by `drinkOf`, a person by the protocol's syntax; anything else is
dropped. `/map?palate=` renders `/p/<handle>` (`Astro.rewrite`).

**Names to drinks:** only `matchDrink` (`src/lib/drinks/search.ts`) turns a
name into a drink, everywhere (pours, the form, menus, search, chat tools):
folded case and accents, the name without its parenthetical, or an alias. No
name may mean two drinks (`tests/unit/drink-match.test.ts`). A pour of an
unmatched drink is kept and moves nothing but its deviations.

**Slugs:** every drink in `drinkDatabase` has a `slug`; records store it
(`app.cotidal.defs#drinkSlug`) and read it back through `drinkOf` (slug, then
name). A slug never changes once a record points at it.

**Placement:** the first 94 drinks were placed by hand. A wine or beer added
since is placed from its style `profile` (body 1–5, residual sugar g/L,
structure 0–4) by `placeStyle`, fit to the hand-placed ones (`CALIBRATION`,
2.9 points RMS). Its `x`/`y` are computed, never typed
(`tests/unit/placement.test.ts`). Outside sources: `docs/drink-sources.md`.

**Bars** are a filter on the map, never a street map: `MenuView` in the card,
`addMenuLine` → `matchDrink`, ranked by `rankMenu`
(`src/lib/drinks/menu-rank.ts`) as numbered pins. Bars near you come from
OpenStreetMap (`src/lib/drinks/osm.ts`, `useNearby`). "Pick this" saves a
`DrinkPick` on the device.

### Terrain — `src/lib/palate/terrain.ts`

Taste as ground, not a point: expected rating at every coordinate by
Gaussian-process regression, the quiz's point as a first hill and each rated
pour raising or lowering ground around its drink. Two liked areas are two
hills (`tests/unit/terrain.test.ts`). A rating is partly about the drink
itself (`DRINK_SD`) and carries less to another kind of drink (`KIN_ACROSS`).
Recomputed from quiz answers and pours, never stored; order doesn't matter.
Every height has an `sd`; `evidenceAt` names the pours behind it. Constants
are uncalibrated; `LENGTH` stays above placement's 2.9-point error.

It ranks menus (`scoreDrinks`, `rankMenu`): by height in bands of
`HEIGHT_BAND`, and only within a band do `VibeTag`s sort
(`relevanceOf`, `src/lib/palate/scoring.ts`;
`tests/unit/relevance-score.test.ts`). A row says what put a drink there,
never a predicted score. `leanings` describes a taste in the axes' words,
never a region's name. Someone else's taste is read by `taste-reading.ts`;
comparing with a drink or a person is one function (`compareWith`,
`compare.ts`). Still on the point: the reveal after the questions and the
region share cards.

### Point, track and EKF — `src/lib/palate/palate-state.ts`, `track.ts`

The point is what a pour's reveal shows moving (`Moved.tsx`, `trail` on
`PalateMap`); it is not drawn otherwise. `applyPour` moves x/y by a capped
rule; a 5D EKF (`StateVector`: Rich-Crisp, Savory-Sweet, bitter, tannin,
complexity tolerance, in the order of `latentVector` in
`app.cotidal.palate.json`) learns the rest. An axis learns only if
`predictHedonic` reads it; drink-side inputs are derived from `Drink`
(`complexityDemand`), never stored. Volume drunk and hours since eating
(`PourContext`) normalise a rating on the device and are never in a record.
Maths: `docs/sensory-science.md`.

**The track is replayed, never stored** (`track.ts`): from the latest quiz
through every pour by `applyPour`. A replay that doesn't land where you are
answers `null` (`tests/unit/track.test.ts`).

### Elicitation — `belief-state.ts`, `question-selector.ts`, `useDiscoveryQuiz.ts`

An exact posterior over a half-point grid and over answerer noise
(`NOISE_LEVELS`). Each answer multiplies in `choiceProbs`, the one response
model, which the selector uses too; the posterior is recomputed from all
answers, so order doesn't matter. After the fixed openers the selector asks
the question with the most expected information about *position*
(`expectedGain`) plus `AVERSION_WEIGHT` per open aversion. `choiceTable`
speeds the hot loop; a test holds it equal to `choiceProbs`.

- **Only the first four questions (`CALIBRATION_IDS`) are fixed.** Never
  hard-code a path through the quiz in a test.
- Answers are kept as asked (`BeliefState.responses`) and written as one
  `app.cotidal.elicitation` per quiz, never edited; a guest's waits on the
  device until sign-in. Nudges are stored in tenths. `RESPONSE_MODEL` names
  the scoring model: change it when the model changes.
- The quiz's x/y variance becomes the starting covariance, and nothing in it
  calls a model.
- How it works (`/?about=1#how-it-works`, `howItWorks` in `copy/`) is the public
  account of this; `tests/unit/how-it-works.test.ts` holds it to
  `MIN_QUESTIONS`, `MAX_QUESTIONS`, `MAX_POUR_STEP` and the 7/3 rating
  thresholds. Change one, update the copy in the same commit.

### Drink and region prose — `src/content/`

Content collections (`src/content.config.ts`), drawn by `DrinkEntry` and
`RegionEntry`. A drink on the map opens its whole entry in the card
(fetched prerendered as `/drinks/<slug>.json`); `/drinks/<slug>` is a
script-free map page for SEO/AEO with `Recipe` JSON-LD and one link,
`/map?drink=<slug>&quiz=1`. There is no `/drinks` list. A region is a filter
on the map (`/map?region=<id>`, `RegionPanel`), not a page.

- **Frontmatter carries no coordinates**: an entry joins `drinkDatabase` by
  `name`, exactly, including any parenthetical (`Daiquiri (Classic)`).
- **`documented` may not be empty**: what is attested is kept apart from
  what is only told (`claimed`), with `sources`.
- To add a drink entry: `src/content/drinks/<slug>.md`, `<slug>` the drink's
  slug; `family` is a closed enum in `content.config.ts`. Then
  `npm run typecheck` and `npm run test:unit -- tests/unit/drink-content.test.ts`.
- A region entry holds prose only; its name, axis and gloss are `quadrants`
  in `copy/`, its drinks come from the map, its shared ingredients from
  `src/lib/drinks/ingredients.ts`. Linked drinks must be placed in that
  region (the test fails otherwise). Nothing documented may be about the
  region itself, a Cotidal construct.
- Write from primary sources. Wikipedia is an index, not a source: its text
  is CC BY-SA, and close paraphrase would attach share-alike.

### AT Protocol — `src/lib/atproto/`

`lexicons/*.json` are authoritative; `records.ts` is their Zod. Sign-in is
`auth.ts`, writes `publish.ts`, bar claiming `venue-verify.ts` /
`venue-publish.ts` / `venue-read.ts` (Level 1: the bar's domain resolves to
its DID).

- **Bindings come from `cloudflare:workers` via `src/lib/runtime.ts`,
  never `locals.runtime.env`**, whose getter throws in Astro v6+ (an
  optional chain doesn't help).
- **Sessions.** `bsky_sid` is an opaque id into a sealed server-side store;
  `oauthSession()` authorises, and anything billed or destructive gates on
  `restoredDid()`. `SESSION_SECRET` (Worker secret, 32+ chars) seals it;
  unset on Workers, sign-in is off. Session restores queue at one Durable
  Object per member (`AUTH_LOCK`, exported by `src/worker.ts`), because a
  refresh token works once. In dev use `http://127.0.0.1:9002`, not
  `localhost`.
- **Whether sign-in is on is a runtime answer:** `signInEnabled()` in
  `auth.ts` (`ATPROTO_ENABLED` under `[vars]` in `wrangler.toml`, plus
  `SESSION_SECRET`), passed to every island as a prop. Never read it from
  `import.meta.env` or in browser code (`tests/auth-endpoint.spec.ts`).
- **Reading other people** (`public-read.ts`, `public-taste.ts`): handle →
  DID → document (`@atproto/did`) → PDS → records, with no session, `https:`
  only, time-boxed, cached by repo revision. Unit tests fake `fetch`; route
  tests use `nobody.invalid`. **Made-up people** (`sample-people.ts`) are
  `.test` handles read with no network: `/map?palate=deep.test`, `both.test`,
  `deep.test&with=surf.test`, `quiet.test`. `publicMapPath` lives in
  `paths.ts` because the island links to it and must not import the server
  package.
- **`/mcp`** (`src/lib/mcp/`): the same reads as MCP tools, plain functions,
  descriptions in `copy/`. Logging from chat is a draft link
  (`src/lib/pours/pour-draft.ts`). Details: `docs/mcp.md`.
- **No floats in records.** Fractions are integer hundredths or tenths named
  for it (`xHundredths`, `dxTenths`); convert at the edge (`encodePalate`,
  `decodePalate`, `decodeCoordinates`). No lexicon may declare `number`.
- **Places are `community.lexicon.location.*`**, never our own (`location.ts`
  writes `.geo`), checked against the vendored files in
  `tests/fixtures/community-lexicon/` (copy again to update, never edit).
- **Zod says exactly what the lexicon says:** `lexString()` (UTF-8 bytes,
  graphemes, `@atproto/syntax` formats, never a look-alike regex),
  `lexInteger()` not `.int()`. `npm run lexicons` compares them field by
  field and parses with `parseLexiconDoc`;
  `tests/unit/lexicon-conformance.test.ts` runs both validators.
- **Datetimes:** lenient on read, strict on write (`writtenDatetime`,
  `new Date().toISOString()`); compare as instants.
- **Objects nest by `ref`**, never inline `"type": "object"`; an open
  dictionary is `unknown`.
- **A record holds what its author said.** Untouched fields are absent, not
  defaulted; nothing inferred is stored in their name.
- **The browser loads `vocab.ts` and `elicitation-record.ts`, never
  `records.ts`** (type-only imports are fine).
- **Writes go through `logPour`** (`src/lib/pours/pours.server.ts`), which
  validates (`PourWriteSchema`) before anything is written; reads are parsed
  (`readPour`), not cast (`tests/unit/log-pour.test.ts`). Written
  vocabularies (`DEVIATIONS`, `CATA`) are `knownValues` ids; their words are
  in `copy/`.
- **Records are never rewritten.** Reconciling an unclaimed reference to a
  later account is the app view's job.
- **Spaces** (`app.cotidal.bar`, `spaces.ts`): prepared, not wired, until the
  Spaces beta. Checked against the alpha via the dev aliases
  `atproto-lexicon-spaces`, `atproto-syntax-spaces`,
  `atproto-oauth-scopes-spaces`; `npm run lexicons` fails once the released
  parser knows spaces, so the aliases get removed. `docs/data-model.md`, Bars as spaces.

## Conventions

- **There are no members yet.** No redirects for moved pages, no read paths
  for old record shapes, no shims. Change it and update every link. This
  ends once real records or printed codes point at the site.
- Test the contract, not the path. Logic is Vitest in `tests/unit/` (no
  server, no browser); pages and routes are Playwright in `tests/*.spec.ts`
  against the preview build. Run the suite as CI does: `npm test`. Against
  `npm run dev`, about a third fails (React 19's dev build on workerd).
- Model routes are gated, metered, fall back deterministically and send
  `x-generation`; a new one inherits all four (`docs/generation.md`). Mock
  model boundaries: the suite passes with no API key.
- Install scripts are approved by name (`allowScripts` in `package.json`);
  review a new one with `npm install-scripts ls`.
- Held back on purpose: TypeScript 7 (typescript-eslint and `@astrojs/check`
  support below 6.1), Tailwind 4 (replaces the config the lint rules read),
  and Vite+ (replaces `vite` under Astro; Oxlint skips `.astro` templates).
- `npm` is the package manager; `packageManager` pins the npm Workers Builds
  uses.
- In Claude Code on the web, `.claude/hooks/session-start.sh` installs
  dependencies and sets the env vars the suite needs.
- "Triangulation", "Calibration", "Architecture", "Context" are internal
  names; never in the interface (`docs/brand.md`).

## Roadmap

Open work only; the reasoning for the order is `docs/routes.md`.

1. **Namespace.** `app.cotidal.*` holds once `cotidal.app` is registered.
2. **Menu capture.** Typed, pasted and (members) photographed menus work.
   Next: keep a photo as a sighting (`app.cotidal.menu`), index sightings by
   bar, and decide a guest allowance (`docs/map-first.md`, Where a bar's
   menu comes from).
3. **Venue claim.** Level 1 is built (`/bars`, `/v/<handle>`). Next: the
   postcard check, the bar confirming sightings, and its space (waits on the
   Spaces beta; `docs/data-model.md`, Venues and Bars as spaces).
4. **Elicitation.** Swipes for breadth; fit `NOISE_LEVELS`,
   `EVIDENCE_SCALE` and `PAIR_NOISE_SCALE` from logged answers against
   pours. Never swipe on drink names: that measures familiarity.
5. **The Overlap.** Comparing two tastes is built (`compareTerrains`). Next:
   two people in the same bar, discovered through the existing follow graph,
   leading with disagreement. Coasters: print sizing and the code's look
   (`docs/coasters.md`).

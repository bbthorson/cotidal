# Agent Context: Cotidal

Architecture notes for anyone — human or agent — working in this codebase.
Product reasoning lives in `docs/data-model.md` and `docs/brand.md`; this file
is about the code.

## Rendering: keep the front door static

Every page is one template (`docs/design-system.md`, One kind of page): the
map and its card (`MapScreen`; `MapPage.astro` for a page with no script),
the app bar (`AppBar`) the card's top and `ScreenHeader` its title.
`/` is the map with **zero client JavaScript** — a sample palate gaining
ratings (`sample-palate.ts`, frames from the terrain code, animated in CSS)
and the card (`MapPage.astro`) — and so is `/p/<handle>`
(a link sent to a stranger, and where a member compares with people they
follow: a server-read follows list and a plain GET form). `/sign-in` renders a plain form post that works
with JavaScript off and progressively enhances it via `<bsky-sign-in>` (zero
React). `/` asks one thing — find your coordinate — and keeps nothing else:
pulled up, its card says how it works and links to sign-in, which is its own
page. The app is one screen, `/map`, the one React island; the questions are
a state of its card (`/map?quiz=1`, `QuizCard.tsx`), never a page.

The whole app was previously one `client:only` island, so nothing painted
until ~860 KB of JavaScript had downloaded and hydrated — on every route,
landing page included. Astro was being used as a slower Next.js.

- Prefer `.astro` for anything without state. Reach for an island only when
  something genuinely needs to be interactive, and scope it tightly. A page
  that shows the map is `MapPage.astro`, which renders the same React
  `MapScreen` and `PalateMap` that `/map` hydrates, on the server with no
  directive: one copy of the map, and still no script.
- Prefer `client:load` over `client:only` so the shell server-renders.
- The app bar is the top of every page's card (`AppBar`), since the map has
  the top of the screen, and sticks to the top as the card scrolls up. It
  carries the page's name in the wordmark's place (`MapPage`'s `eyebrow`,
  with `back` and `heading`), so a name is said once: mark · name · Menu on a phone (the map, the visible
  reading pages, then the account), and from `lg` a row of tabs under the
  account control (`accountControl` in `site-nav.ts`). `Drinks` (`/drinks`) is `memberOnly` in `site-nav.ts`, so unauthenticated
  visitors on `/` are not sent there from the header or footer; drink pages stay
  live for SEO/AEO and link back to `/map?drink=<slug>` and the questions (`/map?quiz=1`). On `/map`
  the bar names the page like any other ("Map"); the search is content, the
  first thing in the card (`SearchBox.tsx`: drawn by the island on the server
  as a plain GET form to `/map?q=`, so it works before the island does). The
  page passes the bar to the island as a slot. The account control is server
  truth: `@handle` (opening `/settings`) for a member, Sign in for a guest, a
  neutral Account on a prerendered page that cannot know. Signing
  out is on `/settings` alone, never in the header; `/map` carries no account
  strip (a guest's Start over sits at the foot of its card, since a guest has
  no Settings).
  Signing out lands on `/map?signed_out=1`,
  where `AtprotoProvider` — every island mounts it — clears the device's
  copy of the palate while leaving remembered account cards for one-tap return.
- Rating a pour happens in the map's card, never a page or a dialog
  (`RatePanel.tsx`, `useRateSheet`; the contract is `docs/design-system.md`
  § Rating a pour): `?rate=<drink>` or `?draft=1&…` opens it, handled once,
  and the screen gives it its own coordinate and pours so it is current the
  moment it closes. A new trigger calls `open()`; it does not navigate.
- **An app screen is a hook and a drawing.** `useExplore`, `useRatePour`,
  `usePourForm` and `useSignIn` (`src/hooks/`) hold a screen's state and
  what a tap does; `Explore.tsx` (with `PalateMap.tsx`, `SearchBox.tsx`,
  `MenuView.tsx`), `RatePanel.tsx`, `PourForm.tsx` and `SignInSheet.tsx`
  only draw it, so a redesign changes the component and leaves the hook
  alone. The rules a screen applies are plain functions in `src/lib/` —
  `drink-search.ts`, `pour-entry.ts`, `pour-history.ts`, `scoreDrinks` in
  `menu-rank.ts`, `map-draw.ts` — tested in `tests/unit/`. Nothing in
  `src/lib/` or `src/hooks/` imports from `src/components/`.
- There is no separate API layer for the screens, on purpose: a guest's
  palate and the quiz run on the device, so the rules run in the browser,
  and server pages import the same functions rather than calling
  themselves over HTTP. What an outside client reads goes through `/mcp`,
  built on those functions.
- Never add an island to `/`. `tests/landing-static.spec.ts` fails if you do.
- Sign-in is `@bbthorson/atproto-cf-auth`, content-negotiated at
  `/api/auth/atproto/login`: JSON in, JSON out for the island and `<bsky-sign-in>`;
  form-encoded in, 303 out for the plain form (including `signUp=1`).
  Do not break the second path — it is what keeps `/sign-in` working with JS off.

## Single sources of truth

The recurring failure in this codebase is a second, hand-maintained copy of
something that drifts from the first. Three had already happened:

| Layer | Truth | How drift is caught |
|---|---|---|
| Records | `src/lib/atproto/lexicons/*.json` | `npm run lexicons` |
| Styling | `globals.css` tokens + `tailwind.config.ts` | `npm run lint` — arbitrary values, raw colours, and Tailwind's own type sizes are an error in `pages/`, `layouts/` and `components/` |
| Interface copy | `src/lib/copy.ts` | `npm run lint` — words typed into JSX text or a `placeholder` / `aria-label` / `title` / `alt` are an error. Quiz questions (`discovery-questions.ts`, beside their scoring) and the drink and region prose are the exceptions |
| Drink prose | `src/content/drinks/*.md` | `tests/unit/drink-content.test.ts` |
| Region prose | `src/content/regions/*.md` | `tests/unit/region-content.test.ts` |
| What the device keeps | `src/lib/device-store.ts` | *(convention)* — nothing else touches `localStorage` |
| Icons and share cards | `src/lib/mark.ts` (the mark), `src/pages/share/[card].astro` (the cards); `npm run images` writes `public/` from them | `tests/unit/mark.test.ts`, `tests/unit/share.test.ts` |

Found in the wild, each silent:

- The Zod schema and the lexicon for the pour's predecessor described
  different records — the Zod had six fields the lexicon did not, and made a
  required field optional.
- `text-2xs` / `text-3xs` were used 41 times and defined nowhere, so those
  elements rendered at inherited size.
- `font-body` / `font-serif` / `font-condensed` pointed at `--font-*`
  variables that did not exist, so all three Google Fonts loaded and none
  applied.
- Six drinks recommended by the quiz archetypes (since retired) were not in
  `drinkDatabase` at all, so one archetype recommended four drinks the app
  could neither map nor score.

Add a field to a lexicon before using it, a token before styling with it, and
a string to `copy.ts` before rendering it.

## Key modules

### Palate map — `src/lib/data.ts`, `Explore.tsx`, `PalateMap.tsx`
2D plane. Users and drinks both carry `x` (Rich −10 → Crisp +10) and `y`
(Savory −10 → Sweet +10). A drink's place on your menu is its height on your
terrain (Terrain, below); `VibeTag`s sort within it — only among drinks in the
same `HEIGHT_BAND` (`relevanceOf`, `src/lib/scoring.ts`), so a tag can never
carry a drink past a higher one. The menu is one list ranked by that relevance
alone. A menu row says what put a drink there — your ratings near it, or your
answers (`chart.reason`) — never a predicted score; the drink card still says
how far it sits from your point. A weighted sum let tags outweigh several
points of distance; `tests/unit/relevance-score.test.ts` holds the bands apart.

### Psychophysical State & EKF — `src/lib/palate-state.ts`
Models longitudinal taste preference drift via an Extended Kalman Filter (EKF).
The 5D latent state vector ($\mathbf{x}_k \in \mathbb{R}^5$) is `StateVector`:
Rich-Crisp, Savory-Sweet, Bitter Tolerance, Tannin Tolerance and Complexity,
accompanied by error covariance matrix ($\mathbf{P}_k$). Observations are
normalised for Sensory-Specific Satiety (SSS exponential volume decay) and
prandial ghrelin before they reach the filter. Those two inputs — volume
drunk and hours since eating (`PourContext`) — stay on the device: they are
not in the pour lexicon and the log route does not accept them. Detailed psychophysics in
`docs/sensory-science.md`; the order of the axes is also the order of
`latentVector` in `app.cotidal.palate.json`.

An axis learns only if `predictHedonic` reads it — otherwise its Jacobian
entry is zero and so is its gain. Every drink-side input to that function is
derived from `Drink` (see `complexityDemand`), never stored alongside it.

A name becomes a drink through `matchDrink` (`src/lib/drink-match.ts`) and
nothing else — a pour, the form, a bar's menu, the map's search and the chat
tools: folded case and accents, the name without its parenthetical
("margarita" is the Tommy's), or one of the drink's `aliases`. No name, bare
name or alias may mean two drinks (`tests/unit/drink-match.test.ts`). A pour
of a drink with no match is kept, and moves nothing but its deviations.

**The app is one screen, the map** (`/map`, `Explore.tsx`,
`docs/map-first.md`): the map fixed in place as the background
(`PalateMap.tsx` — the plane, your terrain as shading and contour lines,
every drink, your pours with your rating), the search at the top of its card, and one
card for everything else. The map never pans, zooms or moves when something
opens: what changes is what is drawn on it. Where a drink sits on it, its
contours and shading and which drinks get a label are plain functions
(`map-draw.ts`, `ground-masks.ts`). It is drawn to scale (an SVG in map
units, with the marks and labels laid over it in percentages), so the server
draws it whole and `/map` paints before its script arrives; the screen's
geometry is CSS. Every page that shows the map uses one layout,
`MapScreen.tsx` (`live` on `/map`, `static` on a page with no script), and
an Astro page renders it with no directive rather than keeping its own copy. The card holds
where to next (your menu, your bars, bars near you, your pours, your track),
a drink, a bar's menu, or rating a pour; on a phone it rests under the map
and the page scrolls it up over the map, as on every page (a tap on a drink
scrolls back so the map shows), and from `lg` it is a panel down the
left. A drink is reached by tapping it on the map (the nearest mark within
reach) or from the card's lists and the search, which is how a keyboard
reaches every one.

**The map's address** (`src/lib/map-url.ts`, `docs/map-first.md`): the path
picks the card, the parameters pick what the map draws — `drink=<slug>`, and
`palate=<handle or DID>` for someone else's taste, read-only. Read and write
them through `readMapView` and `viewHref`, never by hand: a drink is checked
by `drinkOf`, a person by the protocol's syntax, and anything else is
dropped. `/map?palate=` renders `/p/<handle>` at the map's address
(`Astro.rewrite`). A taste is computed from its author's records, never
stored as one.

A bar is a filter on the map, not a place on a street map: from the search,
your bars, bars near you (a list from OpenStreetMap, `useNearby`), or any
name typed. It opens `MenuView` in the card: type what they pour,
`addMenuLine` matches each line through `matchDrink`, `rankMenu`
(`src/lib/menu-rank.ts`) orders the placed ones, and each becomes a numbered
pin on the map while every other drink fades to a speck. "Pick this" saves a
`DrinkPick` on the device, the waiting pick that `WaitingPick` shows and
rating clears. There is no separate harbour page.

Your point is no longer drawn on the map, which draws your terrain; it is
what the reveal after a pour shows moving (`Moved.tsx` in the card, the trail on the map: `trail` on `PalateMap`) and what your track
replays (the card's Your pours). It is not the filter's estimate: `applyPour`
moves crisp/sweet by a capped, simpler rule and leaves the other three axes
to the EKF.

**Your track is replayed, never stored** (`src/lib/track.ts`): from the latest
quiz's answers (`quizStart`, refitted by `axesFromResponses`) through every
pour since, by `applyPour`, keeping the state between pours as a member's
record or a guest's device keeps it. `tests/unit/track.test.ts` holds the
replay to both paths step by step. A replay that does not land where you are
answers `null` and nothing is drawn; change `applyPour` and old tracks stop
adding up, which is the honest outcome.

### Terrain — `src/lib/terrain.ts`
Your taste as ground over the map rather than a point on it: the expected
rating at every coordinate, by Gaussian-process regression, with the quiz's
point as a first hill (longer along an axis the quiz was unsure of) and every
rated pour raising or lowering the ground around its drink. Two liked parts of
the map are two hills; the point model settles between them, and
`tests/unit/terrain.test.ts` holds both to that case. A rating is partly about
the drink itself (`DRINK_SD`): a 2 for the Martinez sinks the Martinez and
dents its corner, rather than sinking the hill a 9 for the Manhattan made. A
rating carries less to another kind of drink (`KIN_ACROSS`: cocktails and
spirits, wine, beer), so a Manhattan does not bring up the Rioja beside it.
Recomputed from the quiz answers (`useQuizStart`) and the pours, never
stored; pour order does not matter. Every height carries an `sd`, and
`evidenceAt` names the pours behind it. The constants are uncalibrated, and
`LENGTH` stays above placement's 2.9-point error.

It ranks your menu and a bar's (`scoreDrinks`, `rankMenu`), the map draws
it, and `leanings` says your taste in the axes' words in the card's head
("crisp and sweet · rich and savory", `taste` in `copy.ts`) — never one
region's name. Not yet on
it: the reveal after the questions, and the region share cards (a region's
own, which name a region, not a person), which still read the point and its
region. Someone else's taste — their map, the follows list and
the chat tools — is read by one set of rules, `taste-reading.ts`
(`docs/map-first.md`). The dot, the track and `applyPour` are unchanged.


The first 94 drinks were placed by hand. A wine or beer added since is placed
by its style: `profile` (body 1–5, residual sugar g/L, structure 0–4 —
tannin or hop bitterness) through `placeStyle`, whose coefficients are a
least-squares fit to the 15 hand-placed wines and beers (`CALIBRATION`).
Rich ↔ Crisp is body; Savory ↔ Sweet is log sugar less structure; it misses
the hand placements by 2.9 points RMS. `x`/`y` of a styled drink are computed,
never typed; `tests/unit/placement.test.ts` refits the coefficients and holds
every styled drink to its profile. The profiles are style typicals, not
measurements — check them before a drink is written up. Which outside sources
can supply profiles, names and recipes, and on what terms, is
`docs/drink-sources.md`; none is called at runtime.
A drink needs no prose entry to be on the map; without one it has no page and
nothing links to one. It has a `slug` all the same: every drink in
`drinkDatabase` carries one, typed beside its coordinate, and that is what a
pour or a recipe stores (`app.cotidal.defs#drinkSlug`). A stored reference is
read back through `drinkOf` (`drink-match.ts`): by slug, then by name, so a
renamed drink keeps its pours. **A slug never changes once a record points at
it** — while there are no members it may; after, it is as fixed as a printed
URL.

### Elicitation — `belief-state.ts`, `question-selector.ts`, `useDiscoveryQuiz.ts`
`belief-state` holds an exact posterior over the map (a half-point grid)
and over how noisy the answerer is (`NOISE_LEVELS`). Each answer multiplies in
the probability that a user at each point would have picked that option from
the ones offered — `choiceProbs`, the one response model, which the
selector also uses — and the posterior is recomputed from all answers at
once, so the result does not depend on answer order. Inferring the noise is
what makes answers that disagree leave the axis uncertain; with a single
fixed noise, contradictions read as confident "between the two", and
simulated users noisier than assumed were estimated *worse* than by the old
Gaussian stand-in. After the fixed openers, the selector asks the question
with the most expected information about the user's *position* (noise
averaged out, `expectedGain`), plus `AVERSION_WEIGHT` per open aversion it
could resolve. It does not score by expected drop in reported variance: that
rewards questions whose likely answer agrees with the belief.
**Only the first four questions (`CALIBRATION_IDS`) are fixed** — never
hard-code a path through the quiz in a test.
A `pair` question is two options on one axis; under the response model its
answer is a logistic boundary at the pair's midpoint, so it needs no special
case. `PAIR_NOISE_SCALE` is 1 until data says comparative answers are
steadier. None of the noise levels are calibrated against real answers.
By simulation (2D RMSE, users at 1×/2×/4× `ANSWER_NOISE`): 3.34/3.44/4.17 with
the old Gaussian update, 2.53/3.11/4.06 with this one, in slightly fewer
questions. The selector's hot loop uses per-axis tables (`choiceTable`) so a
tap costs tens of milliseconds; a test holds them equal to `choiceProbs`.
Every answer is also kept as asked (`BeliefState.responses`: question id,
the options' authored nudges, the index taken) and, when the quiz finishes,
written as an `app.cotidal.elicitation` record — one per quiz, never
edited. A guest's record waits on the device (`device-store.ts`) until
they sign in. Nudges are stored in tenths: the AT Protocol data model has no
floats. `RESPONSE_MODEL` names the model that scored them; change it when the
model changes, so old answers can be refitted under the model they were
asked under.
The quiz's x/y variance travels
in `UserProfile.variance` and becomes the 5D starting covariance, so a
confident quiz makes early pours move the dot less.
Nothing in the quiz calls a model, so the flow runs offline.
How it works — the front door's card pulled up (`/#how-it-works`), never a
page of its own — is the public account of this section and of how a pour
moves the dot, in plain words (`howItWorks` in `copy.ts`).
`tests/unit/how-it-works.test.ts` holds its numbers to `MIN_QUESTIONS`,
`MAX_QUESTIONS`, `MAX_POUR_STEP` and the 7/3 rating thresholds: change one
and update the page in the same commit.
What may call a model, and who sees the result, is `docs/generation.md`.

### Drink prose — `src/content/drinks/`, `src/content.config.ts`
An Astro content collection behind `/drinks`, prerendered and script-free.
Drink pages are built for SEO/AEO rather than homepage discovery by
unauthenticated visitors (`memberOnly: true` in `site-nav.ts`): each
`/drinks/<slug>` page emits Schema.org `Recipe` JSON-LD and a compare-to-palate
section whose one link, `/map?drink=<slug>&quiz=1` (`questionsForDrink`), places
a stranger and then opens the drink on their map — or, for anyone with a
coordinate already, goes straight to `/map?drink=<slug>`.
Every drinks page is a map page (`MapPage.astro`): the map with the drink
marked, its neighbours named (`neighboursOf`) and its region washed, the tide
turning behind it, and the entry in the card. No terrain: the page does not
know who is reading.

Two rules make it safe to grow. **Frontmatter carries no coordinates** — an
entry joins to `drinkDatabase` by `name`, so the map stays the one place a
drink's position is defined. And **`documented` may not be empty**: the format
separates what is attested from what is merely repeated, which is the whole
reason the register exists rather than being a set of encyclopedia entries.

Prose is written from primary sources rather than adapted from any one
reference, so no entry inherits a share-alike licence.

`/drinks` groups entries under the four regions, and each section carries its
quadrant `id` as an anchor (`/drinks#deep`), and each region is also a
filter (`regionPath`); `tests/landing-static.spec.ts` asserts `/drinks`
offers every region's filter and that each names its region.

**To add an entry**, create `src/content/drinks/<slug>.md`, where `<slug>` is
the drink's `slug` in `drinkDatabase` (`tests/unit/drink-content.test.ts`
holds them equal). The filename is the URL. `name` in the frontmatter must match a `name` in `drinkDatabase` exactly —
including the parenthetical, as in `Daiquiri (Classic)`. `family` is a closed
enum in `src/content.config.ts`; extend it there before using a new value. Then:

```bash
npm run typecheck   # the frontmatter schema is checked at build time
npm run test:unit -- tests/unit/drink-content.test.ts
```

### Region prose — `src/content/regions/`, `src/pages/drinks/regions/[id].astro`
**A region is a filter on the drinks**, not a page of its own:
`/drinks/regions/<id>` (`regionPath`) is `/drinks` narrowed to one region,
on the map with the region washed and its drinks named, and in the card
`RegionFilter` across the top, the drinks first and the region's prose
under them. Prerendered and script-free. There is no Regions item in the
navigation (`RegionFilter` marks the active region). Same format as a drink
(`documented` required, `claimed`, `sources`), one entry per region, and the
filename is the id — which is a URL: `/drinks`, `/p/<handle>`
and the chat tools link to it.

The entry holds only prose. Name, axis and gloss come from `quadrants` in
`copy.ts`; the drinks come from the map; what they share is counted from the
drink entries' ingredient lists through the vocabulary in
`src/lib/ingredients.ts`; "what it says about you" is one template in
`copy.ts` that describes what the product does with a coordinate, not what
the region means. A region is Cotidal's construct, so nothing documented can
be about the region itself — the record is about its drinks and their
ingredients, and the claims about *you* go under `claimed`, with why.
Prose names drinks by linking them, and the test fails if a linked drink is
placed in another region.

Wikipedia is a fine index for finding the primary sources. It is not itself a
source: follow it out to the bar manual, the newspaper, or the archive, cite
that, and write the prose yourself. Its text is CC BY-SA, so close paraphrase
would attach a share-alike obligation to the entry.

### AT Protocol — `src/lib/atproto/`
- `lexicons/*.json` — schemas (authoritative)
- `records.ts` — Zod for `pour`, `menu`, `recipe`, `venue`, `maker`, `elicitation`, `defs`
- `auth.ts`, `paths.ts`, `publish.ts` — sign-in (`@bbthorson/atproto-cf-auth`)
  and writes
- `venue-verify.ts`, `venue-publish.ts`, `venue-read.ts` — Level 1 bar claiming
  matches the bar's website URL domain to its DID (`verifyVenueDomain` on
  `/bars`, Claim your bar; `domainVerified` on `/v/<handle>`). Level 2 physical address
  verification (mailed postcard with a one-time code) is planned in `docs/venues.md`.
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

**Each member's session restores queue at one Durable Object** (`AUTH_LOCK`,
the package's `AuthLock`), because a refresh token can be used once: two
isolates refreshing the same session at once sign the member out, and `/map`
restores twice in parallel. The class is exported by `src/worker.ts`, which is
`main` in `wrangler.toml` and otherwise only re-exports Astro's handler. Off
Workers the binding is absent and the package locks within the process.

**Whether sign-in is on is the server's answer, at runtime:**
`signInEnabled()` in `auth.ts` — `ATPROTO_ENABLED` under `[vars]` in
`wrangler.toml` (not the dashboard: `wrangler deploy` replaces dashboard
variables), plus the `SESSION_SECRET` secret.
`/` renders from it, and every app page passes it to its island as a
prop. Never read the flag from `import.meta.env` or in browser code: that is
fixed at build time, and it once left `/` and the island saying "not enabled"
in front of a server that would have signed people in.
`tests/auth-endpoint.spec.ts` holds the three to one answer.

`public-read.ts` reads *other people's* palates with no session, for
`/p/<handle>` (a map page: their terrain, and for a signed-in visitor both
points to compare) — handle → DID → document → PDS → record. With `taste:
true` it also reads their latest quiz and their pours (`public-taste.ts`,
newest first, at most `MAX_POURS`), which `/p/<handle>` builds their terrain
from as `/map` builds yours; that read is cached in the Workers cache by the
repository's revision (`com.atproto.sync.getLatestCommit`), so an unchanged
repository costs one small request. It runs on a public
route, so it fetches only `https:` hosts, time-boxes every lookup, and parses
the record down to the fields the page draws. The DID document is checked and
read by `@atproto/did` (`didDocumentValidator`, `extractAtprotoData`), not a
hand-written shape. Its unit tests use a fake
`fetch`; the route tests use a reserved TLD (`nobody.invalid`), which is
refused before any network call. **Made-up people** (`sample-people.ts`)
are records the app carries for `.test` handles — a domain the handle spec
keeps for testing, which no real person can hold — read through the same
reader with no network, so someone's map, a drink on it and a comparison can
be seen and tested here: `/map?palate=deep.test`, `both.test` (two hills),
`deep.test&with=surf.test`, `quiet.test` (no palate). Their pages say they
are made up and are kept out of search. `publicMapPath` lives in `paths.ts` because
the island links to it and must not import the server package.

`/mcp` (`src/pages/mcp.astro`, `src/lib/mcp/`) offers the same reads to chat
assistants as MCP tools: read a palate, recommend, rank a menu, compare two,
search drinks. Stateless and read-only; the tools are plain functions over
`readPublicPalate` and `overlap.ts`, so they give the answers `/p/<handle>`
gives. Their descriptions are interface copy and live in `copy.ts`.
A pour is logged from a chat by drafting, not writing: `draft_pour` returns a
`/map?draft=1` link (`src/lib/pour-draft.ts`) that opens rating in the map's
card filled in, with no rating, and the member taps one and logs it (`docs/mcp.md`).
How to connect an assistant is one component, `AssistantSteps` (React,
server-rendered with no script at `/mcp`): at `/mcp` for a browser (the same page answers an MCP client with the tools).

**No floats in records.** The AT Protocol data model has none, and
`@atproto/lex-data` treats one as an invalid value. Fractional quantities are
stored as integer hundredths or tenths under a name that says so
(`xHundredths`, `dxTenths`). The palate is held in memory as `Palate` (plain
numbers) and converted only at the edge: `encodePalate` on every write,
`decodePalate` / `decodeCoordinates` on every read. No lexicon may declare a
`number` — it is not a Lexicon type — and `npm run lexicons` fails on one.

**Places are `community.lexicon.location.*`, never our own.** A pour's
`venue.address` and a venue's `location` are unions of the Lexicon Community's
types. Cotidal writes `community.lexicon.location.geo` (`location.ts`) for a
bar picked from the bars near you — which come from OpenStreetMap
(`src/lib/osm.ts`), which has no type of its own there. Its shape is checked
against the community's published file, vendored in
`tests/fixtures/community-lexicon/` for the reference validator; copy it
again to update it, never edit it.

**Each record's Zod schema says exactly what its lexicon says.** Strings are
built with `lexString()`, which counts UTF-8 bytes and graphemes as the
lexicon does, and checks formats with `@atproto/syntax` — the protocol's
reference implementation, never a look-alike regex. Integers are
`lexInteger()`, not `.int()`, which since Zod 4 refuses anything past
`Number.MAX_SAFE_INTEGER` that the reference validator accepts. `npm run lexicons`
compares every schema in `RECORD_SCHEMAS` with its lexicon field by field and
parses every file with `@atproto/lexicon`'s `parseLexiconDoc` (not
`new Lexicons()`, which accepts anything). `tests/unit/lexicon-conformance.test.ts`
runs Zod and the reference validator over the same records.

**Datetimes** follow https://atproto.com/specs/lexicon#datetime. Reads accept
what the reference reader accepts (it is lenient); writes must be strict
(`writtenDatetime`), and are generated with `new Date().toISOString()` —
milliseconds and `Z`, the preferred form. Compare datetimes as instants, not
strings.

**Objects nest by `ref`, never inline.** A property of `"type": "object"` is
not valid Lexicon; give it a named def. An open dictionary is `unknown`.

**A record holds what its author said, nothing inferred in their name.**
An untouched form field is absent, not a default; "would order again" is
written only when it was asked; and the palate carries no `phenotypes` (a
genetic label guessed from one quiz answer, removed). Derived values belong in
the app, recomputed from the record — never stored as if the user had said
them.

The browser loads `vocab.ts` (names and vocabularies) and
`elicitation-record.ts`, never `records.ts`: the validators that only the
server needs (`@atproto/lex-data`, for CIDs) are registered there. Writes go through the schema: a pour is
validated (`PourWriteSchema`) before the palate or the pour is written —
by `logPour` in `src/lib/pours.server.ts`, the one pipeline every caller
uses (`tests/unit/map-pour.test.ts` holds the order of writes) — and
reads are parsed (`readPour`) rather than cast. Vocabularies the app writes
(`DEVIATIONS`, `CATA`) are stable ids declared as `knownValues`; the words
shown for them live in `copy.ts`.

Records are signed by their authors and **never rewritten**. Reconciling an
unclaimed reference to a later account is the app view's job.

**A claimed bar is an atproto Space** (`app.cotidal.bar`, `spaces.ts`,
`docs/spaces.md`): authority the venue's DID, key `self`, patrons write pours
the venue and its staff read and other patrons do not. Prepared, not wired:
nothing calls a space endpoint until the Spaces public beta. An unclaimed bar
has no space, and nothing stores a space ref — it is derived from the venue's
DID. The released `@atproto/lexicon` and `@atproto/syntax` do not know spaces,
so they are checked against the Spaces alpha, pinned as the dev aliases
`atproto-lexicon-spaces`, `atproto-syntax-spaces` and
`atproto-oauth-scopes-spaces`; `npm run lexicons` fails
when the released parser catches up, so the aliases get removed.

## Conventions

- **There are no members yet.** Nothing is kept only because it already
  exists: no redirect for a moved page, no read path for an old record
  shape, no shim for a renamed id. Change it and update every link. This
  ends the day real people's records or printed codes point at the site.
- Test the contract, not the path. Logic (scoring, belief state, records,
  the chat tools) is a Vitest test in `tests/unit/*.test.ts`: no server, no
  browser, seconds (`npm run test:unit`). Pages and routes are Playwright
  specs in `tests/*.spec.ts`, against the preview build (`npm run test:e2e`).
  A test that needs neither a page nor a request goes in `tests/unit/`.
- **Install scripts are approved by name** (`allowScripts` in
  `package.json`; npm 11 runs none it has not been told to). esbuild and
  workerd install or check their native binaries and are allowed; core-js
  only prints a banner and is denied. A new dependency with an install script
  is reviewed with `npm install-scripts ls`, then approved or denied by name.
- **Held back on purpose:** TypeScript 7 (typescript-eslint and
  `@astrojs/check` support below 6.1 only) and Tailwind 4 (a CSS-first
  config that replaces `tailwind.config.ts`, which the token lint rules and
  `FONT_SIZES` are written against; a migration of its own).
- **Vite+ (`vite-plus`) is not adopted, on purpose.** Vitest is pinned to the
  version it bundles, so moving later is a config change. What blocks it
  today: it replaces `vite` across the tree with its own core build, under
  Astro and `@astrojs/cloudflare`; Oxlint lints an `.astro` file's
  frontmatter but not its template, where the copy and token rules matter
  most; and `vp check` does not run `astro check`. Revisit when Astro
  supports Vite+ and Oxlint reads `.astro` templates.
- Model routes are gated, metered, and always answer with usable content —
  session gate, per-DID limiter, deterministic fallback, `x-generation` header.
  A new one inherits all four (`docs/generation.md`).
- Mock model boundaries in tests. The suite must pass with no API key.
- `npm` is the package manager — `package-lock.json` is the lockfile, and
  `packageManager` in `package.json` pins the npm that Cloudflare's Workers
  Builds installs (the one bundled with `.nvmrc`'s Node).
- In Claude Code on the web, `.claude/hooks/session-start.sh` installs
  dependencies and sets the env vars the suite needs there. Run the suite the
  way CI does: `npm test` (the unit tests, then the build and the browser
  tests against its preview). Against `npm run dev`, server rendering throws "The
  Console.createTask method is not implemented" (React 19's dev build on
  workerd) and about a third of the suite fails.

## Vocabulary

"Triangulation", "Calibration", "Architecture", "Context" are **internal**
names for the algorithm. They are accurate here and must not appear in the
interface; see `docs/brand.md`.

## Roadmap

Open work only; what is built is described above.

1. **Namespace.** `app.cotidal.*`. NSID authority comes from the reversed
   domain, so it holds once `cotidal.app` is registered.
2. **Menu capture.** A bar's menu on the map (`MenuView`) takes a typed menu. Next:
   photograph the menu instead. Photograph a menu, get a recommendation, no
   account required — value before signup, and it builds the venue/menu
   corpus as a byproduct.
3. **Venue claim and menu publishing.** Handle-as-domain makes claiming and
   publishing the same act; the lexicons exist and nothing renders them.
   Claiming also opens the bar's space, where patrons share pours with the
   bar alone (`docs/spaces.md`; addressing and policy prepared, waiting on the
   Spaces beta).
4. **Elicitation.** Swipes for breadth, and fitting `NOISE_LEVELS`,
   `EVIDENCE_SCALE` and `PAIR_NOISE_SCALE` from the logged answers against
   pours. Never swipe on drink *names* — that measures familiarity, not taste.
5. **The Overlap.** `/p/<handle>` draws a taste and, for a signed-in visitor
   or anyone named by `with=`, a second over it (`compareTerrains` in
   `src/lib/overlap.ts`). Next: two people in the
   same bar, conversation starters from what their maps share. Discovery
   comes from the user's existing follow graph, not a second one built here.
   Surface only the intersection; lead with disagreement about drinks.
   **Region badge**: an opt-in Bluesky label showing a member's region to
   anyone who subscribes to Cotidal's labeler — the first step into the follow
   graph. Waits on working sign-in and enough members to show it to
   (`docs/routes.md` § Friends).
   **Coasters**: a member's code over their map, in Settings (`MapCode`),
   printed as a coaster; print sizing and the code's look are open
   (`docs/coasters.md`).

Sequencing and the reasoning behind it: `docs/routes.md`.

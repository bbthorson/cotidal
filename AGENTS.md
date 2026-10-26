# Agent Context: Cotidal

Architecture notes for anyone — human or agent — working in this codebase.
Product reasoning lives in `docs/data-model.md` and `docs/brand.md`; this file
is about the code.

## Rendering: keep the front door static

`/` is pure Astro with **zero client JavaScript**, and so is `/p/<handle>`
(a link sent to a stranger). `/taste` and `/log` mount React islands.

The whole app was previously one `client:only` island, so nothing painted
until ~860 KB of JavaScript had downloaded and hydrated — on every route,
landing page included. Astro was being used as a slower Next.js.

- Prefer `.astro` for anything without state. Reach for an island only when
  something genuinely needs to be interactive, and scope it tightly.
- Prefer `client:load` over `client:only` so the shell server-renders.
- The header's account control is server truth: `@handle` and a Sign out
  form for a member, Sign in for a guest, a neutral Account link on a
  prerendered page that cannot know. `/account` is script-free too. Signing
  out lands on `/taste?signed_out=1`, where the island clears the device's
  copy of the palate.
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
| Styling | `globals.css` tokens + `tailwind.config.ts` | `npm run lint` — arbitrary values and raw colours are an error in `pages/`, `layouts/` and `components/` |
| Marketing copy | `src/lib/copy.ts` | *(convention)* |
| Drink prose | `src/content/drinks/*.md` | `tests/drink-content.spec.ts` |
| Region prose | `src/content/regions/*.md` | `tests/region-content.spec.ts` |
| What the device keeps | `src/lib/device-store.ts` | *(convention)* — nothing else touches `localStorage` |

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

### Palate map — `src/lib/data.ts`, `src/components/app/ResultsScreen.tsx`
2D plane. Users and drinks both carry `x` (Rich −10 → Crisp +10) and `y`
(Savory −10 → Sweet +10). Euclidean distance gives the raw match; `VibeTag`s
sort within it. The menu is one list ranked by that relevance alone.

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

The dot on the map is not the filter's estimate: `applyPour` moves crisp/sweet
by a capped, simpler rule and leaves the other three axes to the EKF.

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
(`/drinks#deep`). Those are two hand-written lists of the same ids;
`tests/landing-static.spec.ts` asserts they still agree.

**To add an entry**, create `src/content/drinks/<slug>.md`. The filename is the
URL. `name` in the frontmatter must match a `name` in `drinkDatabase` exactly —
including the parenthetical, as in `Daiquiri (Classic)`. `family` is a closed
enum in `src/content.config.ts`; extend it there before using a new value. Then:

```bash
npm run typecheck   # the frontmatter schema is checked at build time
npx playwright test tests/drink-content.spec.ts
```

### Region prose — `src/content/regions/`, `src/pages/regions/[id].astro`
`/regions/<id>`, prerendered and script-free. Same format as a drink
(`documented` required, `claimed`, `sources`), one entry per region, and the
filename is the id — which is a URL: the landing page, `/drinks#<id>` and
`/p/<handle>` link to it. Never rename one; a rename adds a redirect
(`formerQuadrantIds`).

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
isolates refreshing the same session at once sign the member out, and `/log`
restores twice in parallel. The class is exported by `src/worker.ts`, which is
`main` in `wrangler.toml` and otherwise only re-exports Astro's handler. Off
Workers the binding is absent and the package locks within the process.

**Whether sign-in is on is the server's answer, at runtime:**
`signInEnabled()` in `auth.ts` — `ATPROTO_ENABLED` under `[vars]` in
`wrangler.toml` (not the dashboard: `wrangler deploy` replaces dashboard
variables), plus the `SESSION_SECRET` secret.
`/` renders from it, and `/taste` and `/log` pass it to their islands as a
prop. Never read the flag from `import.meta.env` or in browser code: that is
fixed at build time, and it once left `/` and the island saying "not enabled"
in front of a server that would have signed people in.
`tests/auth-endpoint.spec.ts` holds the three to one answer.

`public-read.ts` reads *other people's* palates with no session, for
`/p/<handle>` — handle → DID → document → PDS → record. It runs on a public
route, so it fetches only `https:` hosts, time-boxes every lookup, and parses
the record down to the fields the page draws. Its unit tests use a fake
`fetch`; the route tests use a reserved TLD (`nobody.invalid`), which is
refused before any network call. `publicMapPath` lives in `paths.ts` because
the island links to it and must not import the server package.

`/mcp` (`src/pages/mcp.ts`, `src/lib/mcp/`) offers the same reads to chat
assistants as MCP tools: read a palate, recommend, rank a menu, compare two,
search drinks. Stateless and read-only; the tools are plain functions over
`readPublicPalate` and `overlap.ts`, so they give the answers `/p/<handle>`
gives. Their descriptions are interface copy and live in `copy.ts`. Writing
from a chat is planned, not built: `docs/mcp.md`.

**No floats in records.** The AT Protocol data model has none, and
`@atproto/lex-data` treats one as an invalid value. Fractional quantities are
stored as integer hundredths or tenths under a name that says so
(`xHundredths`, `dxTenths`). The palate is held in memory as `Palate` (plain
numbers) and converted only at the edge: `encodePalate` on every write,
`decodePalate` / `decodeCoordinates` on every read, which also accept the
float records written before the encoding. No lexicon may declare a
`number` — it is not a Lexicon type — and `npm run lexicons` fails on one.

**Each record's Zod schema says exactly what its lexicon says.** Strings are
built with `lexString()`, which counts UTF-8 bytes and graphemes as the
lexicon does, and checks formats with `@atproto/syntax` — the protocol's
reference implementation, never a look-alike regex. Integers are
`lexInteger()`, not `.int()`, which since Zod 4 refuses anything past
`Number.MAX_SAFE_INTEGER` that the reference validator accepts. `npm run lexicons`
compares every schema in `RECORD_SCHEMAS` with its lexicon field by field and
parses every file with `@atproto/lexicon`'s `parseLexiconDoc` (not
`new Lexicons()`, which accepts anything). `tests/lexicon-conformance.spec.ts`
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
uses (`tests/log-pour.spec.ts` holds the order of writes) — and
reads are parsed (`readPour`) rather than cast. Vocabularies the app writes
(`DEVIATIONS`, `CATA`) are stable ids declared as `knownValues`; the words
shown for them live in `copy.ts`.

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
- `npm` is the package manager — `package-lock.json` is the lockfile, and
  `packageManager` in `package.json` pins the npm that Cloudflare's Workers
  Builds installs (the one bundled with `.nvmrc`'s Node).
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

1. **Namespace.** `app.cotidal.*`, renamed from `app.crystalcoupe.*`. NSID
   authority comes from the reversed domain, so it holds once `cotidal.app`
   is registered. Old palates and pours are still read from the legacy
   collections (`LEGACY_*_COLLECTION` in `records.ts`), never written.
2. **Migrate `drinkLog` → `pour`** *(Completed)*. Clean-slate implementation
   with 5D EKF dynamic state, gLMS hedonic ratings, CATA volatile descriptors,
   and prandial satiety normalization. Legacy `drinkLog` replaced by `pour`.
3. **Carry the palette into `/taste`** *(Completed)*. The app's components
   are on tokens too: the token rule is an error across `src/components/`, and
   nothing violates it.
4. **Menu capture.** Photograph a menu, get a recommendation, no account
   required — value before signup, and it builds the venue/menu corpus as a
   byproduct.
5. **Region pages** (`/regions/<id>`) *(Completed)*. Sourced prose in
   `src/content/regions/`, linked from the landing page, `/drinks` and
   `/p/<handle>`; see Region prose.
6. **The return visit.** Logging a pour and watching the point move is the
   only recurring behaviour in the product. Its front door is `/log`
   (`ReturnVisit.tsx`), in the site navigation.
7. **Venue claim and menu publishing.** Handle-as-domain makes claiming and
   publishing the same act; the lexicons exist and nothing renders them.
8. **Rework elicitation.** Forced-choice pairs for precision *(landed; see
   Elicitation)* and the 9-point hedonic for post-drink feedback *(landed in
   `PourForm`)*. Answers are logged *(landed: `app.cotidal.elicitation`)*.
   Still to do: swipes for breadth, and calibrating `NOISE_LEVELS`,
   `EVIDENCE_SCALE` and `PAIR_NOISE_SCALE` from those logs against pours. Never swipe on drink *names* — that measures
   familiarity, not taste.
9. **The Overlap.** First step shipped: `/p/<handle>` draws a coordinate at
   a public URL and, for a signed-in visitor, theirs beside it with the
   distance and three drinks (`src/lib/overlap.ts`). Next: two people in the
   same bar, conversation starters from what their maps share. Discovery comes from the user's existing follow
   graph, not a second one built here. Surface only the intersection; lead
   with disagreement about drinks.
   **Region badge** (planned): an opt-in Bluesky label showing a member's
   region on their profile to anyone who subscribes to Cotidal's labeler — the
   first step into the follow graph. Waits on working sign-in, region pages
   and enough members to show it to. Reasoning and constraints:
   `docs/routes.md` § Friends.
   **Coasters** (planned): the chart on a coaster, a member's QR code as
   their profile, and first a four-sector chart. `docs/coasters.md`.

Sequencing and the reasoning behind it: `docs/routes.md`.

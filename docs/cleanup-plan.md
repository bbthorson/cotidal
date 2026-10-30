# Cleanup plan — audit of 30 October 2026

> **Status: carried out** with every recommended default in §1 — WP1–WP9 on
> `claude/app-audit-cleanup-65ty64`. What was not done, and why, is under
> "Left for the owner" at the foot. The rest of this file is kept as the
> record of what was found and decided.

An audit of the app after the move to three tabs (Radio · Compass · Log) and
"Pick a drink". It lists what is left over from earlier versions of the app and
turns it into work packages, each about the size of one PR, for an agent to
carry out in order.

**Read this first if you are the agent doing the work.**

- Read `AGENTS.md` before you start. Its rules still apply: one source of
  truth for each thing, no client JavaScript on `/` or `/p/<handle>`, nothing
  changes the lexicons or what records hold, and every string goes in `copy.ts`.
- Do one work package per PR, in the order below. WP1–WP5 change no behaviour
  and are safe to do right away. WP6–WP8 move things around and depend on
  the decisions in §1. If the owner has not answered a decision, use the
  **recommended** option.
- Before each push run the checks the way CI does:
  `npm run check && npm run build && CI=1 npx playwright test`.
  Never skip, delete or weaken a test so the suite passes. Change a test
  only when the behaviour it pins is meant to change, and say so in the PR.
- Update the docs a change makes stale in the same PR (§WP9 lists them).
- Refer to code by file and identifier, not by line number. Line numbers
  shift as you edit.

---

## 1. Decisions for the owner

Each decision has a recommended default. Edit this section before handing
the plan over if you want something different.

### D1 — What each tab owns

| | Today | Target |
|---|---|---|
| **Radio** (`/radio`, `Radio.tsx`) | Your own pours, newest first. "Following" and "Nearby" say *Later*. The waiting pick. | **Activity.** Unchanged for now. It is the place the social feed lands later. |
| **Compass** (`/taste`, `Home.tsx` → `ResultsScreen.tsx`) | The **quiz and reveal** (first visit), then the street map, search, top pick, the menu and your bars. | **Finding and choosing a drink.** Street map, search, top pick, menu, your bars. The quiz moves out (D3). |
| **Log** (`/log`, `ReturnVisit.tsx`) | The taste chart, stats, the **rating form** ("Log one directly"), the ledger, account links, start over, and a footer of reading links. | **You.** Your coordinate (chart), stats, your pours (ledger), and **the whole account** (absorbs `/account`; see WP6). |
| `/account` | A separate, script-free page: handle, links, chat assistants, start over, sign out. A guest gets a sign-in form. | **Folded into Log** (WP6). The URL redirects. |
| **Pick a drink** (`/harbour`, `Harbour.tsx`) | Where → Menu → Pick, then "Rate it now / later". | **Unchanged**, and it becomes the way into rating (D2). |

### D2 — Where rating a drink lives

You described Compass as the tab for *finding and logging* drinks, and Log as
the tab for your taste and your posts. Today the rating form sits inside the
Log tab's page, so "Log" holds both the profile and the input form.

- **Recommended:** rating becomes a focus-mode screen of its own at `/rate`,
  like the quiz: no tab is highlighted, there is no app bar, and it ends on
  `Moved`. It is reached from "Pick a drink" → *Rate it now*, from the
  waiting-pick card, from "Log this" on a drink card, and from a "Rate a
  drink" link at the top of Log. `/log?draft=…` and `/log?drink=…` must keep
  working, because chat assistants have handed those links out
  (`draft_pour`, `src/lib/pour-draft.ts`). Redirect them to `/rate?…` with
  the query intact, and point `draftPath` and `logPathFor` at `/rate`.
- Alternative: leave the form inside Log as it is. This is the least work,
  but it keeps "Log" meaning two things.

### D3 — Where the questions live

The quiz and the reveal are mounted by Compass (`Home.tsx`), so the
"finding" tab opens on a questionnaire for a new visitor. It also handles
start over (`?startover=1`) and the sign-out cleanup (`?signed_out=1`).

- **Recommended:** a focus-mode route of its own, `/questions`, which
  mounts the questionnaire and reveal (today's `Home.tsx` minus
  `ResultsScreen`) and, when finished, goes to Compass. Update the links
  that start the quiz: landing hero → `/questions`, every "Find your
  coordinate" (Compass, Log's cold state, harbour's cold state, `/p/<handle>`),
  and start over → `/questions?startover=1`. Compass with no coordinate shows
  the map and search, plus a "Find your coordinate" line, as it does now with
  `?browse=1`.
- Alternative: keep the quiz at the Compass URL. This is the least work.

### D4 — Names: routes, files and words on screen

The code still uses the names of three earlier designs:

| Users see | Route | Island / component | Copy object |
|---|---|---|---|
| Compass | `/taste` | `Home.tsx` → `ResultsScreen.tsx` | `nav.map`, `compass`, `menu` |
| Log | `/log` | `ReturnVisit.tsx` | `logPage`, `returnVisit` |
| Pick a drink | `/harbour` | `Harbour.tsx` | `harbour` (its `title` "Harbour" is shown on screen: the page `<title>`, the cold-state eyebrow, the step strip's label) |

- **Recommended:** rename `/taste` → `/compass` with a 301 that keeps the
  query string (add it to `redirects` in `astro.config.mjs`, as with the
  region ids). Rename the files to match their tabs: `Home.tsx` →
  `CompassApp.tsx` (or drop it if D3 moves the quiz out),
  `ResultsScreen.tsx` → `Compass.tsx`, `ReturnVisit.tsx` → `LogScreen.tsx`.
  Merge `returnVisit` into `logPage` and rename `nav.map` → `nav.compass`.
  Keep the `/harbour` URL and the `harbour` identifiers internal, but stop
  showing "Harbour" to users: the page title and the labels say
  "Pick a drink".
- Note: `signedOutPath` (`/taste?signed_out=1`) is in the auth flow. Change it
  and `tests/account-nav.spec.ts` together.

### D5 — The business side (bars and bartenders)

`/bars` is a static page in the **main header nav** of the drinker app
("For Bars"). Its examples come from `src/lib/venues-database.ts`: 15 real
bars with their real domains, and only the first 6 are rendered. The
`venue`, `menu`, `maker` and `recipe` lexicons and Zod schemas exist, but
nothing reads or writes them at runtime.

- **Recommended:** leave the B2B product unbuilt in this cleanup, but clear
  its place out of the drinker app:
  1. Take "For Bars" out of the header `destinations` and keep it in the
     footer (the reading pages) and on the landing page.
  2. Reserve `/bars/*` for the venue product. When it is built it gets its
     own layout, without the drinker app bar or "Pick a drink".
  3. Trim `venues-database.ts` to the venues the page shows, and rename it
     to say what it is (`example-menus.ts`). It is illustration, not data:
     no other code may import it.
- Do not delete the venue/menu/maker/recipe lexicons or schemas. They are
  the foundation of the business side.

---

## 2. Work packages

### WP1 — Remove dead code (no behaviour change)

Each item below was checked by searching the whole repo for imports and
uses. Delete it, then run `npm run check`.

- `src/lib/ai-question-generator.ts`: the whole file (233 lines). Nothing
  imports it. It belongs to the retired AI-question flow. Then delete
  `getMaxUncertaintyAxis` and `getProgressContext` from
  `src/lib/belief-state.ts`, whose only caller was that file.
- `src/hooks/useDiscoveryQuiz.ts` still carries the AI-question and archetype
  plumbing:
  - `aiQuestionsRef`, `aiQuestionsState`, `setAIQuestion`,
    `setFallbackQuestion` and the AI lookup inside `currentQuestion`;
  - the `AnswerResult` return value of `handleAnswer` (no caller reads it;
    make it return `void`) and the `needsAIQuestion` fields;
  - `RecommendedDrink`;
  - in `finishQuiz`, the `candidates` / `scoredCandidates` /
    `rankedCandidates` block, which is computed and thrown away;
  - `tierLabel` and `categoryLabel`, with their hard-coded `'The Details'`
    and `'The Palate'` (internal vocabulary; nothing renders them), and
    `currentTier`. Then remove `getTierLabel`, `getCategoryLabel` and
    `selectFallbackQuestion` from `src/lib/question-selector.ts` if nothing
    else uses them.
- `src/components/app/Moved.tsx`: the `menuChange` prop and the rows it
  builds. No caller passes it, so "what changed on the menu" never shows.
  Either delete the prop, its rows and the copy `moved.rankOnMenu`,
  `moved.offMenu`, `moved.newOnMenu`, **or** compute it in Log and pass it
  (the docs promise it). **Recommended: compute it.** `useMenu` already
  gives the menu before and after.
- `src/components/app/PourForm.tsx`: `CATA_OPTIONS` (unused), `submitSlot`
  (no caller passes it), and the export on `hedonicToRating` (used only
  inside the file).
- `src/components/app/AtprotoProvider.tsx`: the `'use client'` line. It is a
  Next.js directive and means nothing in Astro.
- `src/hooks/use-atproto.ts`: `displayName: null` (always null) and the
  `?connected=true` clean-up "from older links".
- `src/pages/api/atproto-publish.ts`: the `getConnectedDrinkLogs` action
  alias and the `logs` field in its responses. These served pages loaded
  before the drinkLog → pour rename.
- `src/styles/globals.css`: the `.dark` block (the old obsidian palette,
  "nothing toggles this class"). In `tailwind.config.ts`, remove
  `darkMode: ['class']`, `fontFamily.headline` (no uses) and
  `boxShadow.glow` (no uses).
- `src/lib/copy.ts`: remove keys that nothing renders. Check each again with
  a search before deleting:
  `returnVisit.title`, `.intro`, `.youAreIn`, `.poursLabel`, `.menuLink`,
  `.regionLink`, `.logEyebrow`, `.ledgerEyebrow`; `logPage.publicMap`,
  `logPage.startOver`; `harbour.stepOf`; `hero.primaryCtaReturning`;
  `connect.divider`; `quiz.pushAway`; `pour.signInToLog`;
  `publicMap.readEntry`.

### WP2 — Strings in components go to `copy.ts`

These strings are written into components instead of coming from
`copy.ts`:

| Where | String |
|---|---|
| `ResultsScreen.tsx` (×3), `Harbour.tsx` | `` `Closeness ${n}` `` (aria-label). Use `chart.closeness`, e.g. a `chart.closenessOf(n)` function. |
| `Chart.tsx`, `Reveal.tsx`, `Moved.tsx`, `CoordinateMap.tsx` | `` `Your coordinate, in ${region}` ``, `` `…now in ${region}` ``, `'Your coordinate'` |
| `AccountTools.tsx` | `'That did not go through. Try again.'` |
| `src/lib/api-client.ts` | `"This drink is an excellent choice for your palate."`. Also, the server already returns its own fallback (`explanationFallback`). On failure the client should return `null` and `TopPick` should show nothing, rather than invent a line. |
| `src/lib/api-client.ts` | `'Failed to publish profile'`, `'Failed to share to Bluesky'`, `'Failed to process feedback'`. These are shown to users through `result.error`. |
| `src/pages/index.astro` | the `errorCodes` table of sign-in errors. Move it to `copy.ts` (`connect.errors`). The island uses the package's `AUTH_ERROR_MESSAGES`; choose one set and use it in both places. |
| `src/pages/api/atproto-publish.ts` | the `error:` strings returned to the client |
| `Questionnaire.tsx` | `aria-label="Progress"`, `aria-label="Answer options"` |
| `SiteHeader.astro` | `aria-label="Main Navigation"` |

Also fix the comments in `copy.ts` that describe the old app:
`menu` ("replaces the old results dashboard"), `pour` ("shared by the Log
tab in /taste and the return visit at /log"), `logPage` ("and the
account"), and `moved.back` ("Back to your menu", the default for a screen
that now returns to the ledger).

Vocabulary drift to settle while you are here. Do not make new decisions;
pick the word the interface already uses most:

- The drinks register is called "Drinks" (nav), "the rutter" (landing,
  `/drinks` eyebrow, `hero.registerCta` "Open the rutter") and `register`
  (code). Keep `register` in code. On screen, use "Drinks" for navigation and
  "the rutter" only as the register's own title.
- "Order": `docs/design-system.md` says nothing in the interface says
  *order*, because Cotidal picks and the bartender takes the order. Still
  saying it: `reveal.continue` ("See what to order"), `harbour.astro`'s doc
  comment, `site.description`. The rule allows sentences about the bar
  itself, so leave `site.description`. Change `reveal.continue`.

### WP3 — Shared logic: one copy of each helper

The same logic was written several times:

1. **"Your bars" from your pours.** It exists three times, with two
   different `fold` functions:
   `ResultsScreen.tsx` (`bars`, `fold` with diacritics),
   `ReturnVisit.tsx` (`recentVenues`, plus a fourth count for stats),
   `Harbour.tsx` (`recentBars`, a different `fold` that strips a
   parenthetical). Move them to `src/lib/pour-history.ts`:
   `foldName`, `barsFromPours(pours)` → `{ name, pours, last }[]`,
   `recentBarNames(pours, n)`. Keep the harbour's
   parenthetical-stripping as `placeDrink`'s own matching rule. It matches
   *drink* names, not bar names.
2. **The register's title for a drink:** `register[name]?.title ?? name`
   appears more than 15 times. Add `titleOf(register, name)` to
   `src/lib/register.ts`.
3. **Profile → `User` (filters from aversions).** `profileToUser` in
   `Home.tsx` and the `user` memo in `ReturnVisit.tsx` build the same thing,
   but only one of them clamps to ±10. Move it to one function in
   `src/lib/` and use it in both places.
4. **Loading pours.** `usePours` exists, but `ReturnVisit.tsx` has its own
   `loadData`, and `Harbour.tsx` calls `getConnectedPours` directly.
   **Bug:** because of that, the harbour ignores a guest's pours. A guest's
   "Recently" bars and the venue weighting in the ranking are always empty.
   Use `usePours` everywhere. Add a `prepend` or `reload` so Log can show a
   new pour at once.
5. **Who is signed in.** The server knows (`accountFor` → `member` prop),
   and so does the island (`useAtproto().isConnected`, a second request).
   `Radio` uses the server's answer, `ResultsScreen` and `ReturnVisit` use
   the island's, and `ReturnVisit` uses both. Pass `member` from the page to
   every island (`taste.astro` and `harbour.astro` do not yet). Base "where
   do my pours live" on `member`. Keep `isConnected` only for the sign-in
   sheet's state.
6. **Clearing the device after sign-out.** `forgetDeviceAfterSignOut` lives
   in `Home.tsx`, so sign-out has to land on `/taste`. Move it into
   `AtprotoProvider`, which every island mounts, so sign-out can land
   anywhere (WP6 needs this).
7. **`appUrl`.** The client sends `window.location.origin`, and
   `https://cotidal.app` is hard-coded as a fallback five times
   (`api-client.ts` ×2, `atproto-publish.ts` ×3). The URL in a member's
   feed post is built from that client value. Derive it on the server from
   `new URL(request.url).origin` and drop the field from the request.
8. **JSON responses.** `atproto-publish.ts` repeats
   `new Response(JSON.stringify(…), { status, headers: { 'Content-Type': … } })`
   about 20 times. Add one small `json(body, status)` helper.

### WP4 — Shared UI components: one copy of each pattern

Each of these is built by hand more than once. Extract each one once and
replace the copies. Most belong in `src/components/app/ui.tsx`, or in
`globals.css` `@layer components` when no state is involved:

| Pattern | Copies today | Becomes |
|---|---|---|
| Guest "keep this / come aboard" banner (card, title, body, Sign in button) | `Radio.tsx`, `ReturnVisit.tsx`, `ResultsScreen.tsx` | `<GuestPrompt title body onSignIn />` |
| Segmented control (ink frame, active cell `bg-secondary`) | `Radio.tsx` filter, `Chart.tsx` lens, `PourForm.tsx` where/rating, `Harbour.tsx` step strip | `<Segmented>` for the buttons. The step strip may stay its own `<ol>`, but give it the same classes through a `.segmented` class. |
| Pinned bottom card (fixed above the app bar, close button, `data-drink-card`) | `DrinkCard` in `Chart.tsx`, `BarCard` in `Near.tsx`: the same shell, written twice | `<PinnedCard eyebrow onClose>` |
| Text input | `PourForm.tsx` `inputClass` (16px), `SignInSheet.tsx` (16px), `ResultsScreen.tsx` search and both `Harbour.tsx` inputs (**15px**, `text-ui`) | a `.field` class in `globals.css` at 16px. **Bug:** inputs under 16px make iOS Safari zoom when they get focus, so the Compass search and both harbour fields zoom today. |
| Caps text link / text button (`inline-flex min-h-11 items-center font-condensed text-xs uppercase tracking-label …`) | about 35 times | `.link-caps` (plus a colour class) |
| Section heading (`border-b border-foreground pb-1.5 font-serif text-xl font-bold`) | 6 times, plus near-copies in `index.astro` | `.section-title` or `<SectionTitle>` |
| Chip / tag (`border px-2 py-0.5 font-condensed text-xs uppercase tracking-label text-secondary`) | `PourLedger.tsx` (2 identical blocks), `Harbour.tsx` `Chip`, `PourForm.tsx`, `DrinkCard` "Also here" | `.tag` (static) and `<Chip active>` (toggle). The design system allows three tag styles (axis, region, status); map each use to one of them. |
| "Find your coordinate" italic underlined link | `ResultsScreen.tsx`, `Chart.tsx`, `index.astro` (`readFirst`, `secondaryCta`) | `.link-serif` |
| Loading "…" pulse | `Radio.tsx`, `PourLedger.tsx`, `Near.tsx`, `TopPick` | `<Loading />` |
| Cold state (eyebrow, title, prose, primary button) | `ReturnVisit.tsx`, `Harbour.tsx` | `<ColdState>` |

The ESLint `HAND_PRIMARY` / `HAND_OUTLINE` rules show the pattern: once a
class exists, add a rule that rejects the spelled-out version.

### WP5 — Design tokens

`npm run lint` passes, so colours and arbitrary values are under control.
The type scale is not, and neither are a few values in `globals.css` and
`tailwind.config.ts`.

1. **Two type scales.** The role tokens (`text-meta`, `ui`, `prose`, `plate`,
   `title`, `hero`, `region`) sit next to about **134 uses of Tailwind's
   default sizes**: `text-xs` ×67, `text-sm` ×23, `text-base` ×17,
   `text-xl` ×13, `text-lg` ×7, `text-2xl` ×4, `text-4xl`/`5xl`/`6xl` ×1
   each. Add the roles that are missing to `fontSize` in
   `tailwind.config.ts`, **and to `FONT_SIZES` in `src/lib/utils.ts`**
   (`tests/class-merge.spec.ts` holds the two lists equal), then migrate.
   Suggested additions, sized to what the defaults render today so nothing
   shifts:

   | New token | Size / leading | Replaces |
   |---|---|---|
   | `text-label` | 12px / 1rem | `text-xs` on condensed caps (labels, links, buttons, `.label-caps`, `.btn`) |
   | `text-field` | 16px / 1.5 | `text-base` on inputs (the iOS minimum) |
   | `text-lead` | 16px / 1.625 | `text-base` on prose (`.prose-entry`, `PageTitle` lede, card titles in banners) |
   | `text-heading` | 20px / 1.3 | `text-xl` section headings |
   | `text-subtitle` | 24px / 1.2 | `text-2xl`: drink and bar card titles, the region name in the chart's cartouche |
   | `text-display` | 36px → 48px at `md` | `PageTitle`'s `text-4xl md:text-5xl` (two tokens, or one plus `md:text-display-lg`) |
   | `text-hero-lg` | 60px / 1.05 | `index.astro`'s `md:text-6xl` |

   Map `text-sm` (14px) to `text-meta` (13) or `text-ui` (15) one case at a
   time: metadata goes to meta, running text to ui. Map `text-lg` (18) to
   `text-plate` (19). Leave `leading-relaxed` in only where a token's own
   leading is wrong.

   Then add a lint rule beside the others in `eslint.config.mjs`: reject
   `text-(xs|sm|base|lg|xl|[2-9]xl)` in `src/pages`, `src/layouts` and
   `src/components`. Document the new tokens in `docs/design-system.md`.
2. **Letter-spacing.** The segmented controls use `tracking-wider` (5 uses)
   and the wordmark uses `tracking-widest`, but the system names
   `tracking-label` and `tracking-wordmark`. Move them onto the named ones.
3. **Shadows repeat the colour values** instead of the tokens:
   `shadow-mcm` is `hsl(8 55% 40%)` (that is `--primary`) and `shadow-bar`
   uses raw hsl values. Write `shadow-mcm` as `4px 4px 0 0 hsl(var(--primary))`
   and give `shadow-bar`'s two colours names in `:root`.
4. **Opacity inside `globals.css`.** `.dot-leader > .leader` uses
   `hsl(var(--foreground) / 0.3)` and its reveal variant uses `0.35`. Make
   them `--leader` and `--reveal-leader`, as `--chart-axis` already is.
   The Leaflet attribution's `font-size: 0.625rem` should be
   `theme('fontSize.3xs')`.
5. **`font-mono` silently resolves to Barlow.** It is used twice
   (`bars.astro`), and `font-code` (real monospace) once. Replace the two
   `font-mono` uses with `font-condensed`, then remove the `mono` alias so a
   future `font-mono` is plainly undefined instead of quietly wrong.
6. **Repeated layout values:** `pb-80` (room for the pinned card, ×2) and
   `max-h-96` on the card. Give them names in `spacing`, as `tabbar`
   already is (`card-clearance`, `card-max`).
7. **Leaflet marker sizes** (`NearMap.tsx`: radius 7/6/11, weight 2/3).
   They are JavaScript because Leaflet paints SVG from options. Collect them
   in one `MARKER` constant with a comment pointing at the chart's
   `DrinkSpot`, so the two maps' dots are sized in one place each.
8. **`--accent` / `bg-accent`** has no uses in components. Keep it only if
   the docs give it a role; otherwise remove it from the config and the
   docs table.

### WP6 — The account moves into Log

This depends on D1 (recommended) and WP3.6.

- The account section at the foot of Log (`AccountTools`) becomes the
  account: handle, your public map, share, chat assistants, retake the
  questions, sign out. Use the headings and body text `/account` uses today
  (`account.*` copy), so nothing is lost. Remove the `nav.account` link from
  `AccountTools`, which now points at the place you are already in.
- `/account`: answer with a redirect to `/log#account` (302, because it was
  a real page and its purpose may come back). Keep it on the server so the
  header's "Account" link on prerendered pages still works.
  `tests/account-nav.spec.ts` changes with it. Keep its tests that start
  over in two steps and that sign-out is script-free; they now run on `/log`.
- `accountHref` in `site-nav.ts` becomes `/log#account`. The header's
  `@handle` and the neutral "Account" link both go there.
- **Signing in from inside the app.** `signInHref` sends only `/taste` to
  the in-app sheet. On `/radio`, `/log` and `/harbour` the header's
  "Come aboard" leaves the app for the landing page's form (`/#connect`).
  Make the `?signin=1` handler shared (in `AtprotoProvider`, like WP3.6),
  and have `signInHref` return `?signin=1` on every app page.
- Sign-out (`signedOutPath`) can then land on `/log?signed_out=1` or stay
  where it is; it no longer has to be `/taste`.
- The reading-pages footer at the bottom of Log (`logPage.readingLabel`)
  stays. It is the phone's only way to the reading pages from inside the
  app.

### WP7 — Questions and rating get their own screens; names match tabs

This depends on D2, D3 and D4. Do it as three small PRs in this order.

1. **`/questions`** (D3). Move the questionnaire and reveal out of
   `Home.tsx` into an island on a new page. It is focus mode, so it has no
   app bar or header on a phone (`data-focus-mode`). The landing CTA,
   `?startover=1` and every "Find your coordinate" point here. Compass
   (`ResultsScreen`) becomes the island's only screen. Delete `?browse=1`
   (Compass always browses) and its landing link `hero.secondaryCta`
   ("Look at the map first"). That link now drops visitors on a street map,
   because the taste map has moved to Log. Delete it; the section it sits
   in already links each region. Tests to update: `quiz-flow.spec.ts`,
   `landing-static.spec.ts`, `account-nav.spec.ts` (start over),
   `public-map.spec.ts`.
2. **`/rate`** (D2). Move the rating form and `Moved` out of `ReturnVisit`
   into an island on a new focus-mode page. Redirect `/log?draft=…` and
   `/log?drink=…` to it with the query intact. `draftPath` and `logPathFor`
   point there. Log keeps a "Rate a drink" link where "Log one directly" was.
   Tests: `pour-draft.spec.ts`, `pour-entry.spec.ts`, `return-visit.spec.ts`,
   `harbour.spec.ts`, `mcp-tools.spec.ts` (the draft URL).
3. **Renames** (D4). Rename `/taste` → `/compass` (with a 301), rename the
   files and copy objects, and rename `pickHref` in `site-nav.ts` and the
   page title so "Harbour" is no longer shown on screen. Search for
   `/taste` in `src/` and `tests/`; it appears in 17 source files and 10
   test files, including `site-nav.ts`, `paths.ts`, `auth.ts`,
   `sign-out.ts`, `ConnectForm.astro`, `p/[actor].astro`, `Harbour.tsx`
   ("Rate it later" goes to `/taste`) and `ReturnVisit.tsx`.

### WP8 — The business side (D5)

- Remove `{ href: '/bars', … }` from `destinations` in the header. Keep it in
  the footer: add an `inHeader` flag, or let the footer list it on its own.
  Update `tests/layout-shell.spec.ts` and the header section of
  `docs/design-system.md`.
- `src/lib/venues-database.ts` → `src/lib/example-menus.ts`, trimmed to the
  6 venues `/bars` shows, with a header comment saying it is illustration
  only. `bars.astro` prints `venue.domain` in the style used for a handle.
  Show it as plain text or drop it, so no one reads it as that bar's
  account on the protocol.
- `bars.astro` uses the default type scale (`text-sm`, `text-lg`,
  `text-xl`, `text-2xl`) and `font-mono` throughout. WP5 covers it.

### WP9 — Docs and repo hygiene

Stale docs (each describes an earlier version of the app):

- `README.md` § Routes: no `/radio`, `/harbour`, `/assistants`, `/mcp`.
  `/taste` is still "the quiz, the reveal and your menu". "Only `/taste` and
  `/log` mount islands" is false (Radio and the harbour mount islands too).
- `AGENTS.md` § Rendering: "`/taste` and `/log` mount React islands" (also
  `/radio` and `/harbour`). After WP6 and WP7, update the header and
  `/account` paragraph and the sign-out landing.
- `conductor/tech-stack.md`: "React 19 islands on `/taste` and `/log` only".
- `docs/design-system.md`:
  - § Navigation item 3: the member's `@handle` "opens `/account`";
  - § Compass: "the foot of the menu — who you are, your public map,
    share, account, start over — is one block". Compass no longer has
    that block;
  - § The first-visit flow: lives on `/taste`;
  - after WP4 and WP5, the component and token tables.
- Code comments that name the old layout:
  - `AppShell.astro` and `AppBar.astro` ("Chart · Harbour · Log");
  - `AccountTools.tsx` ("Compass keeps only start over");
  - `Moved.tsx` ("After a pour, in /taste and /log");
  - `PourForm.tsx` ("the menu in /taste can re-weight"; "for /taste and
    /log alike");
  - `ReturnVisit.tsx` ("the same … screen as the Log tab in /taste");
  - `log.astro` ("The return visit");
  - `index.astro` ("Everything interactive lives at /taste");
  - `harbour.astro` ("what to order");
  - `SignInSheet.tsx` ("Log a pour").

Repo cruft:

- `verification/`: 3.4 MB of PNGs committed by hand, mostly screenshots of
  `/taste` results and nav states that no longer exist. Nothing references
  them. Delete the folder.
- `conductor/`: the original brief and December 2025 plans. They are
  already marked historical, and nothing in the build or tests reads them.
  `tracks.md` is an empty heading and `setup_state.json` is tool state.
  **Ask the owner** before deleting; if they agree, keep a one-line note in
  `README.md` that git history has them.
- `.gitignore`: the `# vercel` section and the yarn/pnp entries are left
  over from the Next.js template. `npm` is the package manager.
- **Check before changing:** `wrangler.toml` says `name = "crystal-coupe"`,
  but the live Worker is served at `cotidal.bbthorson.workers.dev`. Ask
  the owner which name Cloudflare's Workers Builds deploys under. If the
  dashboard renamed it, a `wrangler deploy` from a terminal would create a
  second Worker named `crystal-coupe`. Do not rename it without
  confirmation. The package `name` in `package.json` can be renamed safely.

---

## 3. Bugs found during the audit

Fix each one inside the work package named, or on its own if it is urgent:

| Bug | Where | WP |
|---|---|---|
| iOS Safari zooms when the Compass search or harbour fields get focus (15px inputs) | `ResultsScreen.tsx`, `Harbour.tsx` | WP4 (`.field`) |
| The harbour ignores a guest's pours: "Recently" is always empty and the venue weighting is off | `Harbour.tsx` | WP3.4 |
| The header's "Come aboard" on Radio, Log and Pick a drink leaves the app for the landing page | `site-nav.ts` `signInHref` | WP6 |
| After a pour, the menu change the docs promise is never shown (`menuChange` is never passed) | `Moved.tsx`, `ReturnVisit.tsx` | WP1 |
| The landing page's "Look at the map first" opens Compass's street map, not the taste map (now on Log) | `index.astro` | WP7.1 |
| On a failed request, `TopPick` shows an invented line ("an excellent choice…") as if it were the explanation | `api-client.ts` | WP2 |
| The feed post's link is built from a URL the client sends | `atproto-publish.ts` | WP3.7 |

---

## 4. Left for the owner

- **`conductor/`** (the December 2025 brief and plans, already marked
  historical): not deleted, because WP9 says to ask first. Nothing reads it.
- **The Worker's name.** `wrangler.toml` still says `name = "crystal-coupe"`
  while the site is served at `cotidal.bbthorson.workers.dev`. Left alone
  until the dashboard's name is confirmed. The `package.json` name is now
  `cotidal`. Two other deployed names still say crystal-coupe — the AI
  Gateway id (`AI_GATEWAY_ID` in `src/lib/generation.ts`) and the KV
  namespace in `wrangler.toml` — and are Cloudflare resources, not code to
  rename.
- **The harbour's cold state** (`Harbour.tsx`) was not folded into
  `ColdState`: it offers one action, not three, and says different things.
- **A lint rule for hand-spelled `.link-caps` / `.segment`.** The classes
  exist and the app uses them; spotting the spelled-out form by regex was
  not reliable enough to enforce.
- **`astro check` reports one hint** in `src/pages/log.astro` (a value used
  only inside a top-level `return Astro.redirect(…)` is flagged "never
  read"). It is a false positive of the Astro language server, not an error.

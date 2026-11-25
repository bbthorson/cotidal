# Map first: the app as one chart

Built: `/map` is the app's one screen (`Explore.tsx`), as described here,
with the menu ranked on the terrain. The decisions under Decided were made
with the owner; Still to decide and the later build steps are open.

Before, the signed-in app was two tabs, each a page with a framed chart near
the top and lists under it: Compass (the drinks, measured from you) and Your
map (you). This makes the chart the app: everything between the header and the footer is the palate plane, edge
to edge, and every other thing is drawn on it or in a sheet over it, the way
a maps app works. A clickable prototype with the real drink coordinates and
sample bars and pours: https://claude.ai/artifact/HJNpUB2kta14LW3aCZkLj1

## Decided

1. **The map is the background, and it does not move.** It sits in one
   place, sized to the screen, and is interactive: tap a drink or your dot.
   What changes is what is drawn on it (a bar's pins, the line to a drink,
   your dot moving after a pour), never where it is. No camera flights, no
   panning.
2. **One map, no views to switch.** It always shows you (the dot, the shoal,
   your track), the drinks you have poured (filled where you rated them 7 or
   more, with the rating beside the name), and every other drink as a small
   ring. "Your menu" and a separate terrain view were two names for the same
   picture and are gone.
3. **One card for everything else.** Discovery (drinks close to you, bars
   near you, your pours, recent or favourites), a drink, a bar's menu, and
   rating a pour all happen in the card. There is no rating dialog and no
   Rate a drink button: open a drink, tap a score, log it.
4. **A menu comes from a photo, and becomes official only when the bar
   confirms it.** Anyone can photograph a bar's menu; it is saved to that
   bar as a patron's photo. It is the bar's listing only once the bar has
   proved it owns its address and approved those photos.
5. **Searching for a bar is core; a street map is not.** A bar is a filter
   on the tide map. Typing a bar we know nothing about opens an empty tide
   map, "No known menu", and asks for a photo of the menu; once read, its
   drinks appear on the map.
6. **Your taste is terrain, not a point.** A single point assumes liking
   falls off evenly in every direction and lives in one place; pours
   contradict both. The terrain (`src/lib/terrain.ts`) is the expected
   rating everywhere on the map: the questions lay a first hill, each rated
   pour raises or lowers the ground around its drink, and two liked parts of
   the map become two hills. See Your taste as terrain, below.
7. **Zoom can wait.** Labels are placed for what matters, and every drink is
   reachable through search and the card's lists.

## The map on every page

Decided with the owner after the map screen was built: the map and its card
are the layout of the whole site, not only of `/map`.

1. **Every page that is about a place on the map is the map and a card**
   (`MapScreen.tsx`). A drink's page is the map with that drink marked, its
   neighbours named and its region washed, and the drink's entry in the card.
   The front door is the map with a sample palate gaining ratings, and the
   card holds the lede and Find your coordinate; pulled up, how it works and
   sign in. The questions run in the card, the shoal narrowing on the big map.
2. **The map is drawn by the server.** One component (`PalateMap.tsx`)
   draws `/map` and the pages with no script, so a static page ships no
   JavaScript for it and `/map` paints before its island hydrates.
3. **On a page with no script, pulling the card up is scrolling.** The map
   stays at the top of a phone's screen and the card scrolls up over it.
   Only `/map` has the dragged card.
4. **A page with nothing of yours to draw shows the tide turning** about the
   map's zero point (`.tide-sweep`), never a terrain that is not yours. A
   drink's page draws no hills: a sample palate behind a Negroni would read as
   a verdict on it. The front door's sample is labelled as one.
5. **The regions are named on every map**, the front door's included.
6. **Settings stays a page of its own**: forms that post to the server and
   the account's destructive actions, nothing that is a place on the map.

Built so far: the server-drawn map and `MapScreen`, on `/map`; the drink
pages, `/drinks` and the region filters, on `MapPage.astro`, each drawing the
map with no script. A drink's page has one action, See where it sits for you
(`/questions?drink=<slug>`), which goes on to the drink on your map. The
front door: the sample palate (`sample-palate.ts`: the start, then a 9, a 3,
a 9 and two 8s, ending on two hills), six frames of the real terrain worked
out on the server and cycled by CSS (`.tide-frame`), the last one held for
anyone who asks for less motion. The questions: in the card over the map,
the shoal narrowing on it, the point settling there at the reveal. Someone's
public map (`/p/<handle>`): their point, and a signed-in visitor's beside it,
on the map, their region washed. How it works and sign-in: the tide turning
behind the card. Then every other page too — Settings (your point, and your
code over your map, which prints as a coaster), For bars and its claim form,
a bar's page (its menu as numbered pins), Chat assistants, an assistant
asking for access, not found: one kind of page (docs/design-system.md). The
bar audit was cut for the map itself; its rule (`menu-audit.ts`) stays for a
bar's card to summarise its menu by.

The app bar is the top of the card (`AppBar.astro`), and the map has the
top of the screen: on a phone it runs from the top edge, and from `lg` the
panel holds the bar, its tabs and the card while the map takes the window's
full height.

Still open: the search in the app bar of every map page (only `/map` has it);
a drink tapped on a static page's map going to its page; the terrain on
`/p/<handle>` in place of the point (as the chat tools and share cards still
read the point too).

## The map's address

Decided with the owner: **the path picks the card, the parameters pick what
the map draws.** A path names the thing the card is about — a drink, a
person, a bar — and is what a search engine indexes. The parameters are one
small vocabulary, read and written by `src/lib/map-url.ts` and nowhere else
(`tests/unit/map-url.test.ts`):

| Parameter | The map draws | Built |
|---|---|---|
| *(none)* | Yours: your account, or this device | yes |
| `drink=<slug>` | That drink marked, its card open | yes |
| `palate=<handle or DID>` | Someone else's taste — their terrain, from their questions and pours — read-only | yes |
| `with=<handle or DID>` | A second taste over the first, as terracotta contour lines, to compare | yes |

They combine: `/map?palate=alice.bsky.social&drink=negroni` is where a
Negroni sits for Alice — how far and which way (`wayTo`), and Where it sits
for you, which is `/map?drink=negroni`. `/map?palate=` is `/p/<handle>`
rendered at the map's address (`Astro.rewrite`), so there is one page for
someone's map. Decided: **the path is canonical** — `/p/<handle>` by their
verified handle, else their DID — because a person is the thing the card is
about, and printed codes point at `/p/<did>`. Every page names its plain
path as canonical (`Base`'s `canonical`): the parameters only change what
the map draws. A person's link unfurls into the site's card and says how
they lean, not a region.

Values are checked, never guessed at: a drink through `drinkOf`, a person
by the protocol's handle and DID syntax; anything else is dropped and the
map is yours. Rating links (`?rate=`, `?draft=1&…`, `pour-draft.ts`) carry
their own `drink=`, which belongs to the pour. Someone else's palate never
writes to your device, and you rate only on your own map.

Their taste is computed from their records (their answers and their pours),
never stored as a record of its own: a record holds what its author said,
the terrain is the app's reading of it and improves when the model does.
The reads (`public-taste.ts`: their latest quiz and up to `MAX_POURS` pours,
newest first) are cached in the Workers cache by their repository's
revision, so a view of an unchanged repository reads one small record.
Their map says what yours says: their taste in the axes' words
(`leanings`), their menu with what put each drink there (their ratings, or
their answers), and for `drink=`, which way it lies from their nearest
hilltop. No region names a person here any more; the share card still reads
the point.

**Comparing** (`with=`, `compareTerrains` in `overlap.ts`): on someone's map
a signed-in reader is compared with by default, and `with=` names anyone, so
`/map?palate=alice.bsky.social&with=bob.bsky.social` compares two other
people. Both tastes are read the same way, from public records. The map
draws the first as shaded ground and the second as terracotta contour lines
over it; the card says how many of the top ten they have in common, then
leads with where they part — a drink each would reach for that the other
would not, at least a point higher on their ground — and one for both. Two
people who like the same things get no invented contrast. The chat tools
and the follows list still compare points (`compareMaps`).

Not yet: `?palate=` on a drink's page (`/drinks/negroni?palate=…`, which
means rendering drink pages per request, cached at the edge), and the chat
tools answering with these links.

## Why

- **The product's answer is a place.** "Which way and how far" is spatial
  (`docs/design-system.md`, The app as a chart). A list turns a distance
  into a number in a column. On the map it is a line from you to the drink.
- **A bar's menu becomes a picture.** Today a bar's menu is a ranked list
  (`MenuView`). On the map it is a handful of numbered pins around your dot:
  you see at a glance that this bar's drinks are all in the Deep and you
  are in the Surf, which a list of distances does not show.
- **The chart is too small to read.** 122 drinks sit on 103 spots of a
  20 × 20 plane. Given the whole width of a phone and labels placed by what
  matters to you, the map can name the drinks you are choosing between; the
  current chart, a figure at the top of a page, names none.
- **Your two screens describe one thing.** Compass is the drinks with your
  dot; Your map is your dot with your drinks. On one map they are layers,
  and the split rule ("draw your state on Your map, not on Compass") stops
  being needed.

## The screen

```
┌──────────────────────────────────────────┐
│ ◐ COTIDAL                     @handle    │ header, unchanged
├──────────────────────────────────────────┤
│ [ Search drinks or bars            ]     │ floats over the map
│┌────────────────────────────────────────┐│
││ The Eddy        SWEET        The Surf  ││
││     ·  ·    ·        ·  ● Daiquiri · 8 ││ the plane, fixed:
││ RICH          ──┼──      ◉ you   CRISP ││ full width on a phone
││     ·   ·        ·   ·    ·   ·        ││
││ The Deep       SAVORY    The Salt Line ││
│└────────────────────────────────────────┘│
├──────────────────────────────────────────┤
│ ▔▔ You are in The Surf · +4.2, +3.1  More│ the card's head (drag or tap)
│ Where to next                            │ the card, resting under the
│ Close to you · Bars near you · Your pours│ map; pulls up over it
└──────────────────────────────────────────┘
```

**The map.** On a phone the plane is the full width of the screen, under
the search box; the card rests in the space below it, so at rest nothing
covers the map. From `lg` the card is a panel down the left and the plane
fills the rest. The ground beyond the plane carries the same graticule to
the screen's edges. It is drawn as `CoordinateMap` draws it now: the four
regions named in italic, the axis words, the shoal and your track. Labels
are placed by priority (the selected drink, a bar's pins, your pours, the
drinks nearest you) and dropped where they would overlap.

**The card** has a head and a body. The head is always the same line —
"You are in The Surf · +4.2, +3.1" and More — and is where you drag it up or
tap it. The body scrolls on its own, so dragging and scrolling never fight.
It rests below the map and goes up to cover it. It holds one of four
things:

- **Where to next** (the start): your waiting pick, if there is one, with
  Rate it; *Close to you*, eight drinks nearest you with which way and how
  far; *Bars near you*, each with what we know of its menu; *Your pours*,
  Recent or Favourites. Tapping a row selects the drink on the map; on a
  wide screen, hovering a row rings its drink.
- **A drink**: region and coordinate, how far and which way, your last pour,
  Also here, Read the entry, Pick this here (in a bar), and the rating: nine
  cells, then **Log it**. Logging replaces the cells with what the pour did
  ("Moved 0.4 toward the Daiquiri", or "Held"), and the dot moves on the map.
  On the map, a line runs from you to the drink with its distance.
- **A bar**: where its menu came from, its drinks numbered nearest first
  (the same numbers as the pins), and the lines that did not place. Or, with
  no known menu, **Photograph the menu**, with typing as the fallback.
- **You**: tapping your dot opens the card full and scrolls to Your pours.

**Search** is one box over drinks and bars:

- **A drink** selects it: the line from you, the drink in the card.
- **A bar** becomes the map's context, a chip in the search box ("The
  Lantern Room ×"), and the search then looks inside its menu. Every other
  drink fades to a speck and the bar's drinks become numbered pins (1 in
  terracotta, as the top of your menu is now).
- **A bar we don't know.** Any name typed can be opened as a bar. Its map is
  empty, "No known menu" written in the half of the map you are not in, and
  the card asks for a photo. The photo is read into lines, each line is
  placed (`addMenuLine`), and the pins drop onto the map.
- **A drink not on the map** can still be opened and rated: it is kept, and
  moves nothing.

There is no footer and no button bar: the card's head is the cartouche, and
its body holds every action.

## Your taste as terrain

Measured on the app's own code (`applyPour`): someone the quiz put near the
middle who rates ten drinks 9, half in the Deep and half in the Surf, ends at
about (0.7, 0.0). Their nearest drinks are Hazy IPA and Hefeweizen; every
drink they rated 9 is 8 to 11 points away; and the shoal narrows as it goes.
The point is pulled to the middle, where neither part of their taste is.

The terrain fixes that by being a surface. With the same ten pours its two
hilltops are at (−6.5, −6.5) and (7, 5.5); every drink rated 9 ranks above
Hazy IPA, and the questions' own hill is still there at (1, 0), at a 7,
because nothing they rated contradicts it.

**What the map draws.** The ground as contours — the co-range lines of the
cotidal chart the brand is named for — high ground darker, and fading where
`sd` says nothing supports it. Your pours on it as now. No dot.

**What a screen says about a drink.** The reason, not a score: "near your
Negroni (9)" (`evidenceAt`), or, where only the questions speak, "near where
your answers put you". Which way and how far remain for a drink selected on
the map, measured from the nearest hilltop.

**Wired in.** Compass's menu and a bar's are ranked by it, each row saying
what put the drink there, and Your map says your taste in the axes' words
("You lean crisp and sweet · rich and savory") instead of a region's name.
Two tunings came first: a rating is partly about the drink itself, so one
dislike sinks that drink rather than its corner (a heavy-tailed reading of
ratings was tried first and did not help: three drinks a point apart cannot
tell which rating is the odd one); and a rating carries less to another kind
of drink, so a Manhattan no longer brings up a Rioja.

**Still to decide:**

- **No single region for a person.** Decided: a person is described by
  which ways their hills lean, not by one region. Still on the point and its
  region: the reveal after the questions, `/p/<handle>`, share cards, the
  coasters, the region badge and the chat tools. The regions stay as names
  for parts of the map and for the reading pages.
- **The track.** The way you came becomes the way the ground changed; it
  needs its own drawing.
- **Breadth in the questions.** The quiz reads answers that disagree as a
  noisy answerer; some of that may be broad or two-sided taste, which the
  terrain can now hold.
- **Drift.** Old pours count as much as new ones. Taste moves; a pour's
  weight may need to fade with age.

## Where a bar's menu comes from

A photo, read and kept as a sighting. The record for it exists already:
`app.cotidal.menu` with `capture.method: "photo"`, the photo as a blob (4 MB,
JPEG, PNG or WebP) and the reader's `confidence`. Authority comes from the
repository that signs it (`docs/data-model.md`, Menus are posts), so the
three states of a bar's menu need no flag:

| State | What exists | On the map |
|---|---|---|
| **No known menu** | Nothing | Empty, and Photograph the menu |
| **From patrons' photos** | Sightings in patrons' repositories | Pins, marked not confirmed by the bar |
| **Confirmed by the bar** | The venue's own `app.cotidal.menu`, signed by the DID its domain proves | Pins, marked confirmed |

**Confirming is publishing.** A bar proves its address through
handle-as-domain (`docs/routes.md`, The supply side), sees the photos patrons
have saved to it, and approves them by publishing the menu in its own
repository. Nothing anyone else wrote is edited. Saying *which* photos it
approved needs a field the lexicon lacks — an optional list of the
sightings it was built from (`strongRef`s) — added to the lexicon before
it is used.

**Reading the photo calls a model**, so it follows `docs/generation.md`:
behind the session gate, metered per DID, and answering with usable
content when the model fails, which here is the typing form. Two
consequences:

- The model writes the lines it read, and the person checks them before
  they are saved, so the record still holds what its author said. Placing
  them on the map stays deterministic (`matchDrink`), so the model never
  produces a coordinate.
- A guest cannot photograph: a guest has no session, and no repository for
  the blob. A guest can type a menu, kept on the device; signing in is what
  saves a photo to a bar. Menu capture "with no account required"
  (roadmap item 2) would need a guest allowance of its own.

**For others to see a bar's photos**, something has to index sightings by
bar. A sighting written through Cotidal can be indexed when it is written
(in D1 or KV, which the Worker already binds); one written by another app
waits for the app view (`docs/lexicon-adoption.md`, Indexing via the
firehose). The index is a cache of public records, never the source of
them.

**Which bar is meant.** A bar typed by name is `venueRef.entity.name` and
nothing else, and two patrons' "Copper Kettle" may be two bars. Where the
device has a position (Bars near you, from OpenStreetMap), the sighting
also carries `venueRef.address` as `community.lexicon.location.geo`, as a
pour does now, and the index groups by name and place. Without one it
groups by name alone, and the bar's confirmation is what settles it.

## Bars without a street map

Bars are found by name, not by panning a street map. Search knows the bars
in the index, your bars (from your pours), and the bars near you when the
device has given its position; a name it does not know can still be opened.
`NearMap` and its OpenStreetMap tiles are retired from the app; the list of
bars near you stays, in the sheet and in search, and a bar's sheet can link
to it on OpenStreetMap.

## What carries over

The hooks and `src/lib` rules carry over almost unchanged, because "an app
screen is a hook and a drawing" (AGENTS.md):

- Ranking and search: `useMenu` / `scoreDrinks`, `searchDrinks`, `wayTo`,
  `drinksAtSameSpot`, `rankMenu`, `addMenuLine`.
- You: `useTrack` / `track.ts`, `logTotals`, `PourLedger`.
- Bars: `useNearby` (the list, not the map), `barsFromPours`, `poursAtBars`.
- Rating: `useRatePour`, `usePourForm`, `logPour`, the `?rate=` and
  `?draft=1` contract (now opening the card).

New:

- **The map** (`PalateMap`) for the app page: fixed, sized to the space the
  search and the resting card leave, tappable. `CoordinateMap` stays for the
  static pictures (`/p/<handle>`, the reveal, the questions' shoal).
- **Label placement** as a pure module with unit tests: priority, collision,
  and fanning out a bar's pins that share a coordinate (the Daiquiri and the
  Southside are both at +7, +5).
- **One hook for the screen**, merging `useCompass` and `useMap`, holding
  what the card is about (nothing, a drink, a bar) and whether it is up.
- **Rating in the card.** `PourForm`'s rating moves into the drink card;
  the detail fields (what was off, spirit, glass, the note) open under it
  for a member. `RateSheet` goes; `?rate=` and `?draft=1` open the drink in
  the card instead.
- **The context in the address.** `?drink=<slug>` and `?bar=<name>`, so a
  card can be linked, as `?rate=` already can.
- **Menu capture**: a photo route under the generation rules, the
  confirm-the-lines step, the sighting write, and the index of sightings
  by bar.

## What it changes

- **One route instead of two tabs.** Recommend `/map`, which a chat
  assistant's draft link already opens; `/compass` goes, with every link
  updated (there are no members yet, so no redirect). The phone's app bar
  (Compass · Your map) goes; the card's head takes its place.
- **AGENTS.md and `docs/design-system.md`.** The split between the two
  charts, "Choosing what to have is one screen, Compass", the two tabs,
  "Rating a pour is a sheet" (it becomes part of the drink card), rule 10
  (one action per screen) and rule 12 (a map sits in a frame on the ground,
  which still holds: the plane is framed, on a ruled ground).
- **Accessibility.** The canvas is a picture. Everything on it is also in the
  sheet as a list (your menu, a bar's pins, your pours), and a drink can
  always be reached by search, so nothing needs the map to be pointed at.
- **Nothing moves under the reader.** The map never moves; the card opens
  over it rather than pushing it.
- **Guests.** The same canvas with no dot until the questions are answered:
  the cartouche says "No position yet" and offers Find your coordinate, as
  Compass does now. `/` stays static and island-free.

## Open questions

1. A guest's photo: is signing in to photograph a menu acceptable, or should
   guests get a small allowance (and somewhere to keep the photo)?
2. A patron's photo is a blob in their own repository, which anyone can
   read. Is that what a member expects when they photograph a menu, or
   should the app say so at the moment of saving?
3. How a bar approves: all photos at once by publishing a menu, or one by
   one? The lexicon change depends on it.

## Build order

1. **One screen at `/map`.** *Built.* The fixed map with your terrain; the
   card with its four contents and rating in it; the search in the header
   over drinks and bars, a bar as a filter with its menu's pins and a typed
   menu where there is none. `/compass`, the street map, the rating dialog
   and the app bar are gone.
2. **Menu capture**: photograph, read, check the lines, save as a sighting;
   the index by bar, so other people see it.
3. **Confirmation**: the bar proves its address, reviews the photos and
   publishes its menu; the lexicon field for what it approved.
4. **Zoom**, if the labels prove too few.

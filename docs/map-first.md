# Map first: the app as one chart

The decisions behind the map and what is still open. How the map and its
card look and behave today is `docs/design-system.md` (One kind of page, The
map); how the code is laid out is `AGENTS.md`. Decisions here were made with
the owner.

## Decided

1. **The map is the background, and it does not move.** It sits in one
   place, sized to the screen. What changes is what is drawn on it (a bar's
   pins, a drink marked, a pour's trail), never where it is. No camera
   flights, no panning.
2. **One map, no views to switch.** It always shows your terrain, the
   drinks you have poured (filled where you rated them 7 or more, with the
   rating beside the name) and every other drink as a small ring.
3. **One card for everything else.** Where to next, a drink, a bar's menu and
   rating a pour all happen in the card. There is no rating dialog.
4. **A menu becomes the bar's only when the bar confirms it.** Anyone can
   photograph or type a bar's menu; it is the bar's listing only once the
   bar has proved its domain and published the menu itself (Where a bar's
   menu comes from, below).
5. **Searching for a bar is core; a street map is not.** A bar is a filter
   on the map, found by name, from your bars or from the bars near you
   (OpenStreetMap, as a list). A bar we know nothing about opens with "No
   known menu" and asks for its menu.
6. **Your taste is terrain, not a point.** See Your taste as terrain, below.
7. **Zoom can wait.** Labels are placed for what matters, and every drink is
   reachable through search and the card's lists.
8. **The map is every page's layout**, not only `/map`'s: a drink's page,
   the front door, someone's map, Settings and the forms are all the map
   and a card (`MapScreen.tsx`), drawn by the server with no script.
9. **A page with nothing of yours to draw shows the tide turning**, never a
   terrain that is not yours. A drink's page draws no hills: a sample palate
   behind a Negroni would read as a verdict on it. The front door's sample
   is labelled as one.
10. **The questions are a state of the card** (`/map?quiz=1`), never a page.

**Why.** The product's answer is a place: "which way and how far" is spatial,
and a list turns a distance into a number in a column. A bar's menu becomes
a picture — numbered pins all in the Deep while you are in the Surf, which a
list of distances does not show. And 122 drinks on a 20 × 20 plane can only
be named when the map has the whole width of a phone.

**Still open:** the search on every map page (only `/map` has it); a drink
tapped on a static page's map going to its page.

## The map's address

Decided with the owner: **the path picks the card, the parameters pick what
the map draws.** A path names the thing the card is about — a drink, a
person, a bar — and is what a search engine indexes. The parameters are one
small vocabulary, read and written by `src/lib/map/map-url.ts` and nowhere else
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
people who like the same things get no invented contrast. The follows list
and the chat tools read and compare people the same way, through
`taste-reading.ts`; the point comparison (`compareMaps`) is gone.

Not yet: `?palate=` on a drink's page (`/drinks/negroni?palate=…`, which
means rendering drink pages per request, cached at the edge), and the chat
tools answering with these links.

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
`sd` says nothing supports it. Your pours on it. No dot (how it is drawn:
`docs/design-system.md`, The map).

**What a screen says about a drink.** The reason, not a score: "near your
Negroni (9)" (`evidenceAt`), or, where only the questions speak, "near where
your answers put you". Which way and how far remain for a drink selected on
the map, measured from the nearest hilltop.

**Wired in.** Your menu and a bar's are ranked by it, each row saying what
put the drink there, and the map's caption says your taste in the axes' words
("You lean crisp and sweet · rich and savory") instead of a region's name.
Two tunings came first: a rating is partly about the drink itself, so one
dislike sinks that drink rather than its corner (a heavy-tailed reading of
ratings was tried first and did not help: three drinks a point apart cannot
tell which rating is the odd one); and a rating carries less to another kind
of drink, so a Manhattan no longer brings up a Rioja.

**Still to decide:**

- **No single region for a person.** Decided: a person is described by
  which ways their hills lean, not by one region. Still on the point and its
  region: the reveal after the questions and the share cards. The region
  badge (`docs/routes.md`) assumes one region per member and needs
  revisiting. The regions stay as names for parts of the map.
- **The track.** The way you came becomes the way the ground changed; it
  needs its own drawing.
- **Breadth in the questions.** The quiz reads answers that disagree as a
  noisy answerer; some of that may be broad or two-sided taste, which the
  terrain can now hold.
- **Drift.** Old pours count as much as new ones. Taste moves; a pour's
  weight may need to fade with age.

## Comparing

Comparing your map with a drink and with a person is one comparison: a drink
is a point on the map, a person is a set of points — their ground
(`compareWith`, `src/lib/palate/compare.ts`; `Comparison.tsx`). Either way the card
says the same three things, on the map of whoever it is about:

- **From the nearest hill, which way**: from the nearest of the taste's
  hilltops to the drink, or to the highest of the person's hills (`wayTo`).
- **Whether it is reached for**: a drink at `REACH_FOR` or higher on the
  ground and not a flavour avoided; for a person, how many of their top ten
  are the taste's too.
- **What is behind it**: the taste's own ratings — near the drink, or of the
  person's top drinks.

A person adds where the two part (`compareTerrains`): what each would reach
for that the other would not, and one for both. The map's drink card, a
drink on someone's map and two people compared (`/p`, `/map?palate=`) all
draw it, and the chat tools' `compare_palates` gives the same distance and
way. A height decides "reached for" and is never shown.

## Where a bar's menu comes from

Today a menu is typed or pasted (anyone), or photographed and read by a
model (members: `POST /api/menu/capture`, `docs/generation.md`); either way
the lines are placed on the map and kept on the device. **Not built yet:**
saving the photo as a sighting, the index by bar, and the bar confirming.
The design for those:

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
  (AGENTS.md, Roadmap) would need a guest allowance of its own.

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

## Open questions

1. A guest's photo: is signing in to photograph a menu acceptable, or should
   guests get a small allowance (and somewhere to keep the photo)?
2. A patron's photo is a blob in their own repository, which anyone can
   read. Is that what a member expects when they photograph a menu, or
   should the app say so at the moment of saving?
3. How a bar approves: all photos at once by publishing a menu, or one by
   one? The lexicon change depends on it.

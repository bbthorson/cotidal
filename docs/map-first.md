---
summary: The decisions behind the map (fixed background, one card, taste as terrain, the URL vocabulary, comparing) and the open design for menu sightings.
read_when: Changing what the map draws, its URL parameters, how a taste or comparison is described, or menu capture beyond the device.
---

# Map first

Decisions made with the owner. How the map and card look and behave today is
`docs/design-system.md`; the code is `AGENTS.md`.

## Decided

1. **The map is the background and never moves.** What changes is what is
   drawn on it. No panning, no camera flights; zoom can wait.
2. **One map, no views to switch:** your terrain, your pours (filled at 7+,
   rating beside the name), and a chosen set of other drinks as rings
   (below, What the map draws).
3. **One card for everything else**, including rating. No dialogs.
4. **A menu is the bar's only once the bar publishes it** (below).
5. **A bar is a filter on the map, found by name**, never a street map.
6. **Taste is terrain, not a point** (below).
7. **The map is every page's layout**, drawn by the server with no script.
8. **A page with nothing of yours to draw shows the tide turning**, never a
   terrain that isn't yours: hills behind a Negroni would read as a verdict.
9. **The questions are a state of the card** (`/?quiz=1`).

Why: the product's answer is a place ("which way and how far"), a bar's menu
reads best as pins, and even a chosen set of drinks can only be named with
the whole width of a phone.

## What the map draws

**The library always holds more drinks than the map shows.** Density is
never solved by holding the library back: a view draws its own drinks, chosen
by one function (`drawnDrinks`, `src/lib/map/drawn.ts`;
`tests/unit/map-drawn.test.ts`).

- **Nothing to filter by:** the staples (`STAPLE_SLUGS`), the drinks most
  people know or would be asked about, spread over all four regions and
  every kind of drink, no two at one point. A drink is a staple for being
  ordered, not for being good.
- **A filter** draws its drinks instead of the staples: a search while it
  finds drinks (by name, alias or what is in them, so "mezcal" draws every
  mezcal drink), a region, a drink type, the edge of what you know
  (`lens=explore`), a comparison (`with=`, a table): where the two part,
  the one for both, and the table's picks (`comparedDrinks`; on `/` and
  on `/?palate=…&with=…` alike). One that holds more than
  `MAX_MARKS` keeps its staples first, then its highest on your ground
  (`capMarks`).
- **A bar's menu** draws its pins and nothing else.
- **Always, whatever the filter:** the open drink, your pours, and the drinks
  a view names (a drink's neighbours, your menu).

A drink not drawn is not drawn at all, not faded: a speck still crowds. It
is one search away, and opening it draws it.

Still open: search on every map page (only the app has it); a drink tapped on
a static page's map going to its page; `?palate=` on a drink's page (needs
per-request rendering, cached at the edge).

## The map's address

**The path picks the card; the parameters pick what the map draws.** The path
is what is indexed and is canonical (`Base`'s `canonical`); parameters only
change the drawing. Read and written only by `src/lib/map/map-url.ts`
(`tests/unit/map-url.test.ts`).

| Parameter | The map draws |
|---|---|
| *(none)* | Yours: your account, or this device |
| `drink=<slug>` | That drink marked, its card open |
| `palate=<handle or DID>` | Someone else's terrain, read-only |
| `with=<handle or DID>` | A second taste as terracotta contours, to compare |
| `region=<id>` | That region washed, its drinks in the card |

They combine (`/?palate=alice.bsky.social&drink=negroni`). A person's
canonical path is `/p/<handle>` by verified handle, else `/p/<did>`; printed
codes use the DID. Values are checked, never guessed; anything else is
dropped. Someone else's palate never writes to your device, and you rate only
on your own map.

A taste is computed from its author's records (latest quiz, up to
`MAX_POURS` pours), never stored: the record holds what they said, and the
terrain improves when the model does.

## Your taste as terrain

Why not a point: someone who rates ten drinks 9, half in the Deep and half in
the Surf, ends near (0.7, 0.0) under `applyPour`, nearest to Hazy IPA, with
every drink they loved 8–11 points away. The terrain keeps two hilltops,
(−6.5, −6.5) and (7, 5.5), ranks every 9 above Hazy IPA, and keeps the
questions' hill at (1, 0) because nothing contradicts it.

**What a screen says about a drink** is the reason, not a score: "near your
Negroni (9)" (`evidenceAt`), or "near where your answers put you"; which way
and how far are measured from the nearest hilltop. A person is described by
which ways their hills lean, never by one region; the regions name parts of
the map.

Tunings so far: a rating is partly about the drink itself, so one dislike
sinks that drink, not its corner (a heavy-tailed reading didn't help); and a
rating carries less to another kind of drink.

Still to decide: a drawing for the track as the ground changing; whether
answers that disagree are broad taste rather than noise; and whether old
pours should fade.

## Comparing

A drink is a point and a person a set of points, so comparing with either is
one function (`compareWith`, `src/lib/palate/compare.ts`; `Comparison.tsx`),
saying three things from the taste's nearest hill:

- **Which way** to the drink, or to the person's highest hill (`wayTo`).
- **Whether it is reached for:** at `REACH_FOR` or higher and not avoided;
  for a person, how many of their top ten are shared.
- **What is behind it:** the taste's own ratings.

A person adds where the two part (`compareTerrains`): what each would reach
for that the other wouldn't (at least a point higher on their ground), and
one for both. Two people who agree get no invented contrast. A height decides
"reached for" and is never shown. `/p`, `/?palate=` and the chat tools'
`compare_palates` all say the same.

## Where a bar's menu comes from

Built: a menu is typed or pasted (anyone) or photographed and read by a model
(members, `POST /api/menu/capture`); the lines are placed by `matchDrink` and
kept on the device. Not built: keeping the photo as a sighting, an index by
bar, and the bar confirming. The design:

| State | What exists | On the map |
|---|---|---|
| No known menu | Nothing | Empty, and Photograph the menu |
| From patrons' photos | `app.cotidal.menu` sightings in patrons' repos (`capture.method: "photo"`, the blob, `confidence`) | Pins, not confirmed |
| Confirmed | The venue's own `app.cotidal.menu`, signed by the DID its domain proves | Pins, confirmed |

- **Confirming is publishing.** The bar reviews patrons' photos and publishes
  its own menu; nothing anyone else wrote is edited. Recording *which* photos
  it approved needs a new lexicon field (a list of `strongRef`s).
- **The model only transcribes.** The person checks the lines before saving,
  and placement stays deterministic, so the model never makes a coordinate.
- **A guest can't photograph** (no session, no repo for the blob); "no
  account required" needs a guest allowance of its own.
- **The index** of sightings by bar is a cache of public records (D1 or KV
  for Cotidal's own writes; the firehose for other apps'), never the source.
- **Which bar:** a typed name is only `venueRef.entity.name`; with a
  position (bars near you) the sighting also carries `venueRef.address` as
  `community.lexicon.location.geo`, and the bar's confirmation settles it.

Open questions: should guests get a photo allowance? Should the app say, when
saving, that a patron's photo is public in their repo? Does a bar approve
photos all at once or one by one (the lexicon change depends on it)?

# Map first: the app as one chart

A proposal, not yet built. The decisions under Decided were made with the
owner; the rest is open. Today the signed-in app is two tabs, each a page
with a framed chart near the top and lists under it: Compass (the drinks,
measured from you) and Your map (you). This proposal makes the chart the
app: everything between the header and the footer is the palate plane, edge
to edge, and every other thing is drawn on it or in a sheet over it, the way
a maps app works. A clickable prototype with the real drink coordinates and
sample bars and pours: https://claude.ai/artifact/HJNpUB2kta14LW3aCZkLj1

## Decided

1. **Your map is a view of the same map, not a page.** As a maps app has a
   terrain view, the map has two: Drinks (every drink, measured from you)
   and Terrain (you: the shoal, your track, the drinks you have poured).
   Terrain filters the pours: all, rated recently (the last 30 days),
   favourites (7 or more, the rating that pulls you toward a drink).
2. **Zoom is an improvement, not a prerequisite.** The first version can
   show the whole plane at one scale, with every drink also reachable
   through search and the sheet's lists. Pan and zoom follow.
3. **A menu comes from a photo, and becomes official only when the bar
   confirms it.** Anyone can photograph a bar's menu; it is saved to that
   bar as a patron's photo. It is the bar's listing only once the bar has
   proved it owns its address and approved those photos.
4. **Searching for a bar is core; a street map is not.** A bar is a filter
   on the tide map. Typing a bar we know nothing about opens an empty tide
   map, "No known menu", and asks for a photo of the menu; once read, its
   drinks appear on the map.

## Why

- **The product's answer is a place.** "Which way and how far" is spatial
  (`docs/design-system.md`, The app as a chart). A list turns a distance
  into a number in a column. On the map it is a line from you to the drink.
- **A bar's menu becomes a picture.** Today a bar's menu is a ranked list
  (`MenuView`). On the map it is a handful of numbered pins around your dot:
  you see at a glance that this bar's drinks are all in the Deep and you
  are in the Surf, which a list of distances does not show.
- **The chart is too small to read.** 122 drinks sit on 103 spots of a
  20 × 20 plane. At phone width that is about 17 px per point, so the
  current chart cannot label its drinks. Zooming, and labels that appear as
  you zoom (as street names do), is the standard answer to that density.
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
│ (Your menu) | Cocktails · Wine · Beer…   │ chips (Terrain: All pours ·
│                                          │   Rated recently · Favourites)
│                                          │
│        the palate plane, edge to edge    │
│                                       ▤  │ Drinks ⇄ Terrain
│     pan · pinch · labels by zoom      ◎  │ go to you
│            · · ● you · ·              ±  │ zoom
│                                       ▦  │ whole map
├──────────────────────────────────────────┤
│ ▔▔  Where to next / a bar / a drink / you│ bottom sheet (phone),
│                                          │ left panel from lg
├──────────────────────────────────────────┤
│ You are in The Surf +4.2, +3.1  [Rate a drink] │ footer: the cartouche
└──────────────────────────────────────────┘
```

**The map.** The plane is drawn the way `CoordinateMap` draws it now: the
four regions named in large italic like seas, the axis words held inside the
view as you pan, a graticule that gets finer as you zoom, and dashed rings
around your dot at 1, 2, 3… points. The rings are the distance figure drawn,
so how far a drink is can be read off the map without a score. Your dot sits
in the shoal. Drink labels are placed greedily by priority (the selected
drink, a bar's pins, your menu, then nearest to you) and are dropped where
they would overlap, so more appear as you zoom in.

**Search** is one box over drinks and bars, as Compass's is now:

- **A drink** flies the camera to frame you and the drink, draws the line
  between you with its distance, and opens the drink card in the sheet: how
  far, which way, your last pour, Also here, Pick this, Rate this.
- **A bar** becomes the map's context, a chip in the search box ("The
  Lantern Room ×"), as a maps app's search chip narrows its map. Every other
  drink fades to a speck, the bar's drinks become numbered pins (1 in
  terracotta, as the top of your menu is now), and the camera frames them
  and you. The sheet lists the same numbers, nearest first (`rankMenu`), with
  the lines that did not place listed under them, and says where the menu
  came from: **Confirmed by the bar**, or **From a patron's photo, not
  confirmed by the bar**.
- **A bar we don't know.** Any name typed can be opened as a bar. Its map is
  empty — "No known menu" over the faded drinks — and the sheet offers
  **Photograph the menu**, with typing the drinks as the fallback. The
  photo is read into lines, each line is placed (`addMenuLine`), and the
  pins drop onto the map.

**Chips** belong to the view. Drinks: Your menu (filled dots, on by
default) and the type filters (Cocktails, Wine, Beer, Spirits). Terrain: All
pours, Rated recently, Favourites.

**Terrain** is Your map. A control on the map (as a maps app's layers
button), your dot, or the footer's cartouche switches to it. The drinks you
have not poured fade to specks; the ones you have are drawn with your
latest rating beside the name, filled at 7 or more; your track and the
shoal are drawn; the distance rings are not, because this view is about
where you are rather than how far anything is. The sheet holds what `/map`
holds now: region and coordinate, the figures, the ledger (What moved it)
through the same filter, your link. That replaces the `/map` page.

**The footer** is the chart's cartouche: your region and coordinate, and the
one action, **Rate a drink**. When a pick is waiting it says so and the button
becomes **Rate it**, replacing the `WaitingPick` strip. Logging a pour switches to
Terrain and moves the dot, with the track extending behind it, so the loop of
drink → log → the map changes happens in place.

**From `lg`** the sheet is a panel down the left, over the map, and the
legend sits in the footer.

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
- Rating: `RateSheet`, `useRateSheet`, the `?rate=` and `?draft=1` contract.

New:

- **A canvas** (`PalateCanvas`) for the app pages: pan, pinch, wheel and
  keyboard zoom; layers; label placement. `CoordinateMap` stays for the
  static pictures (`/p/<handle>`, the reveal, the questions' shoal).
- **Two pure modules** with unit tests: the camera (project, fit a set of
  points into the part of the screen the chrome leaves, fly between views)
  and label placement (priority, collision, fan-out for drinks that share a
  coordinate, such as the Daiquiri and the Southside at +7, +5).
- **One hook for the screen**, merging `useCompass` and `useMap`, holding
  the view (Drinks, Terrain), the context (none, a drink, a bar) and the
  sheet state.
- **The context in the address.** `?drink=<slug>`, `?bar=<name>`,
  `?view=terrain`, so a view can be linked, as `?rate=` already can.
- **Menu capture**: a photo route under the generation rules, the
  confirm-the-lines step, the sighting write, and the index of sightings
  by bar.

## What it changes

- **One route instead of two tabs.** Recommend `/map`, which a chat
  assistant's draft link already opens; `/compass` goes, with every link
  updated (there are no members yet, so no redirect). The phone's app bar
  (Compass · Your map) becomes the cartouche footer.
- **AGENTS.md and `docs/design-system.md`.** The split between the two
  charts, "Choosing what to have is one screen, Compass", the two tabs, rule
  10 (one action per screen; it stays, as Rate a drink) and rule 12 (a map
  sits in a frame on the ground; the plane's edge becomes the frame, drawn
  on the canvas).
- **Accessibility.** The canvas is a picture. Everything on it is also in the
  sheet as a list (your menu, a bar's pins, your pours), and a drink can
  always be reached by search, so nothing needs the map to be pointed at.
- **Nothing moves under the reader.** The camera moves only in answer to a
  tap or a search, and the sheet opens over the map rather than pushing it.
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

1. **One screen at `/map`, at one scale.** The whole plane, fitted to the
   space; Drinks and Terrain; search over drinks and bars, a bar as a
   filter with its menu's pins; the sheet; the cartouche footer; the rating
   sheet unchanged. `/compass` and `NearMap` removed, docs and tests
   updated. Labels show for what matters (your menu, a bar's pins, the
   selected drink, your pours in Terrain); every drink is reachable by
   search. This is enough to test the idea.
2. **Pan and zoom**, with the camera and label-placement modules and their
   unit tests, so every drink can be labelled.
3. **Menu capture**: photograph, read, check the lines, save as a sighting;
   the index by bar, so other people see it; a typed menu for guests.
4. **Confirmation**: the bar proves its address, reviews the photos and
   publishes its menu; the lexicon field for what it approved.

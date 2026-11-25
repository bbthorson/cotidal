# Map first: the app as one chart

A proposal, not yet built. Today the signed-in app is two tabs, each a page
with a framed chart near the top and lists under it: Compass (the drinks,
measured from you) and Your map (you). This proposal makes the chart the
app: everything between the header and the footer is the palate plane, edge
to edge, and every other thing is drawn on it or in a sheet over it, the way
a maps app works. A clickable prototype with the real drink coordinates and
sample bars and pours: https://claude.ai/artifact/HJNpUB2kta14LW3aCZkLj1

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
│ (Your menu)(Poured)(Track) | Cocktails…  │ layer and type chips
│                                          │
│        the palate plane, edge to edge    │
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
- **A bar with a menu** becomes the map's context, a chip in the search box
  ("The Lantern Room ×") like a maps app's search chip. Every other drink
  fades to a speck, the bar's drinks become numbered pins (1 in terracotta,
  as the top of your menu is now), and the camera frames them and you. The
  sheet lists the same numbers, nearest first (`rankMenu`), with the lines
  that did not place listed under them.
- **A bar without a menu** opens the same context empty: "We don't have
  their menu yet. Type what they pour." Each line typed (`addMenuLine`)
  drops a pin onto the map as you go. This is `MenuView`'s job, done on
  the map.

**Layers** are chips: Your menu (filled dots, on by default), Poured (your
pours ringed, filled at 7+), Your track; and type filters (Cocktails, Wine,
Beer, Spirits).

**You.** Tapping your dot, or the footer's cartouche, opens Your map's
content in the sheet: region and coordinate, the figures, the ledger (What
moved it), your link. The track is drawn on the map while it is open. That
replaces the `/map` page.

**The footer** is the chart's cartouche: your region and coordinate, and the
one action, **Rate a drink**. When a pick is waiting it says so and the button
becomes **Rate it**, replacing the `WaitingPick` strip. Logging a pour moves
the dot on the same map, with the track extending behind it, so the loop of
drink → log → the map changes happens in place.

**From `lg`** the sheet is a panel down the left, over the map, and the
legend sits in the footer.

## Where a bar's menu comes from

"If we have the menu" is the hard part. What exists today:

| Source | Exists | Reaches |
|---|---|---|
| The bar's own `app.cotidal.menu` | `/api/venue?handle=` | Only a claimed bar, only by handle |
| Your pours at that bar | `barsFromPours` | The drinks you have had there |
| A menu typed on Compass | Not kept | Nothing: `MenuView` keeps only the pick |
| Other patrons' sightings | No app view | Nothing yet |

So for nearly every bar, at first, the answer is "no menu yet", and the
typed menu is the main path. Two changes make it grow:

1. **Keep a typed menu as a sighting.** For a member, write it as an
   `app.cotidal.menu` in their own repository, which the data model already
   calls a sighting ("the same record in a patron's repo is a sighting",
   `docs/data-model.md`). For a guest, keep it in `device-store.ts`. The
   next visit to that bar opens with the menu on the map.
2. **Read other patrons' sightings** once an app view indexes menus
   (`docs/lexicon-adoption.md`, Indexing via the firehose). This is what
   makes the map fill for a stranger, and it is the same corpus menu
   capture and venue claiming build (`docs/routes.md`, The supply side).

Finding a bar by name also needs a source: today search knows your bars
(from pours) and the bars near you (OpenStreetMap, after location is
allowed). A bar elsewhere would need a geocoder query, which is new.

## The street map

The app has a second map, OpenStreetMap's bars near you (`NearMap`). Two
full-screen maps that swap would be confusing, so the proposal keeps the
palate plane as the only canvas: bars near you are a list in the sheet and
in search, and a bar's sheet can carry a small street-map inset for where it
is.

## What carries over

The hooks and `src/lib` rules carry over almost unchanged, because "an app
screen is a hook and a drawing" (AGENTS.md):

- Ranking and search: `useMenu` / `scoreDrinks`, `searchDrinks`, `wayTo`,
  `drinksAtSameSpot`, `rankMenu`, `addMenuLine`.
- You: `useTrack` / `track.ts`, `logTotals`, `PourLedger`.
- Bars: `useNearby`, `barsFromPours`, `poursAtBars`.
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
  the context (none, a drink, a bar, you) and the sheet state.
- **The context in the address.** `?drink=<slug>`, `?bar=<name>`, `?you=1`,
  so a view can be linked, as `?rate=` already can.

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

1. Does Your map fold into the canvas (tap your dot) or stay its own page?
   The proposal folds it in.
2. Does the canvas open on the whole plane, or zoomed to you, as a maps app
   opens on where you are?
3. Should a typed menu be written to the member's repository as a sighting
   (public), or kept on the device until they choose to publish it?
4. Bars beyond your pours and the bars near you: is a geocoder in scope?

## Build order

1. The canvas and its two pure modules, behind the existing Compass, so the
   chart can be judged on its own.
2. One screen at `/map`: the sheet's four states, search over the map, the
   footer, `/compass` removed, docs and tests updated.
3. Typed menus kept as sightings, so a bar's menu is there the next time.
4. Other patrons' sightings, once an app view exists. Then a photographed
   menu (roadmap item 2).

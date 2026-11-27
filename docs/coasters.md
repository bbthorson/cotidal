# Coasters

The four-sector chart and the member's code are built: the code drawn over
the member's map in Settings, printed as the coaster. Venue coasters and
print sizing are notes for later.

The logo is a cotidal circle, the landing chart is a circle, and a bar coaster
is a circle. A coaster carrying the chart is the product's mark in the place
the product is used, and eventually something Cotidal can offer bars.

## Four sectors, not six

The chart once drew six cotidal lines over four quadrants, so its sectors and
the regions did not line up. **Decided: four**, because the map's two axes
give four quadrants and six would be arbitrary slices. The landing chart, the
mark and the coaster all draw four index lines three hours apart (0h / 3h /
6h / 9h), with hairlines between, from one generator
(`src/lib/map/chart-geometry.ts`; `markGeometry` in `src/lib/mark.ts`).
`SECTORS` names each band by its region, and
`tests/unit/chart-geometry.test.ts` fails if the sector count stops matching
the regions.

## The personal coaster is the user's QR code

*Built* in Settings (`#code`), drawn by `MapCode.tsx` — the code on a quiet
square over the member's map — with the URL and the code in
`src/lib/map/coaster.ts`. Printing the page prints the figure alone, the size of
a coaster (`[data-print]` in `globals.css`). It needs
no bar, and it is the Overlap's way into the world.

- A coaster drawn from a member's palate: their map, their taste as ground,
  with the QR code at the centre. (It was the cotidal chart with their region's band filled; a
  person is no longer given a region.)
- **The QR code is their profile.** It encodes the public URL of their map,
  so one code is both the thing you print and the way someone sees who you
  are. Scanned by a stranger, it shows the map, as `/p/<handle>`
  does today. Scanned by a signed-in member, it compares the two tastes: how many
  of the top ten they share, where they part, and one for both
  (`compareTerrains`, `src/lib/palate/overlap.ts`) — two people at the same
  bar comparing coasters.
- It is on screen, not only in print: it is a section of the member's
  Settings, linked from their own public map, so the coaster and the phone
  are the same object. Settings is the member's alone.
- The code must work with no app installed, so it is a plain `https:` URL and
  the page it opens stays script-free like `/p/<handle>`.
- **The code encodes the DID, never the handle:** `publicMapPath(did)`, i.e.
  `/p/<did>`. Handles can change; DIDs do not, and a printed code cannot be
  reissued. The route already accepts a DID and points its canonical link at
  the verified handle — the feed share relies on this for the same reason.
  Keep that path working: a printed coaster is a permanent link into it.
- Rendering the QR on the server keeps `/p/<handle>` script-free; do not ship
  a client QR library to it.

Decided:

- **It prints the ground as it is that day.** Taste moves with every pour;
  the live page the code opens has it right. Open: whether a printed coaster
  wants a plainer field than the day's terrain.
- **Members only.** A guest has no DID, so there is nothing permanent for the
  code to point at. Making a coaster is something you keep by signing in.
- **Opt in.** `/p/<did>` is already public, but a code in someone's hand at a
  bar ties that person to their account for anyone nearby with a phone.
  "Make my code" is a deliberate act, never a default.
- **No tracking in the link.** The URL is bare `/p/<did>`: no `?ref=coaster`.
  A query string is permanent once printed, and it would tell the page that a
  scan happened in person. Measure scans some other way, later, if at all.

**The origin is the request's.** The site has no fixed domain yet, so the
code says whichever host served the page. Before anything is printed, the
code must carry the permanent domain — a printed `workers.dev` link outlives
the move.

## Region coasters

Retired: a person is described by their terrain, not a region, so a coaster
that names one says less than it seems to.

## The code's look

The first pass is a plain QR code on a card-coloured square over the chart,
and it looks bad. The aim is a pattern that is the member's own — a drink on
the coaster, say. Three ways to get there, cheapest first:

- **A standard QR code, styled.** At error correction `H` a QR code still
  scans with about 30% of it covered, which is room for a drink glyph at the
  centre, round modules instead of squares, and the brand's inks. Any phone
  camera still reads it, so it keeps "works with no app installed". Try this
  first.
- **The pattern is the code.** A custom mark (as Spotify Codes do) drawn from
  the coordinate or the member's drinks: the most distinctive, but a phone
  camera cannot read it, so scanning would need Cotidal's own scanner — which
  breaks the no-app rule. Workable only as decoration beside a small plain
  code.
- **NFC in the coaster.** Tap to open; no visible code at all. Costs per
  unit, so it belongs with print.

The coaster's chart is a first pass too: stretched to fill the disc, labels
inside the ring. Like the landing figure and the mark, it has no moon.

## Later

- **Venue coasters.** A bar's menu placed on the chart, with a QR code to its
  published menu. Waits on menu capture and venue claim (the AGENTS.md roadmap,
  `docs/venues.md`).
- **Analog quiz.** A blank chart to mark with a pen. A toy rather than a data
  source: it bypasses the elicitation model.

## Not yet

Print. When it matters: standard coasters are about 4″ round pulpboard in one
or two spot colours; the 1px rings need to be at least ~0.25pt, and the
tokens need a spot-colour mapping. If a brand ever sponsors coasters, check US
tied-house rules on what alcohol suppliers may give retailers before doing it.

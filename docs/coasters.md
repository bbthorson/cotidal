# Coasters

The four-sector chart and the member's code are built: the code drawn over
the member's map in Settings, printed as the coaster. Venue coasters and
print sizing are notes for later.

The logo is a cotidal circle, the landing chart is a circle, and a bar coaster
is a circle. A coaster carrying the chart is the product's mark in the place
the product is used, and eventually something Cotidal can offer bars.

## First: four sectors, not six

The landing chart (`src/components/marketing/ChartFigure.astro`) drew a
12-hour tide with six cotidal lines two hours apart, over the map's two axes.
So it showed six sectors and four quadrants at once, and they did not line up:
the filled band (0h–2h) covers only part of the top-right quadrant. Anyone who
reads the sectors as categories will expect six regions. The monogram
(`Monogram.astro`) has three lines, so there is no single count yet.

**Decision: four.** The map has two axes, so four quadrants come from the
model; six regions would be arbitrary angular slices, and would cost new
region prose, `quadrants` in `copy.ts` and tests.

*Done.* The landing chart has four index lines three hours apart (0h /
3h / 6h / 9h), with unlabelled hairlines for the hours between (`HOUR_LINES`), drawn from `src/lib/chart-geometry.ts`. Each line leaves the
centre along an axis and sweeps toward the ring, so a band is exactly a
region near the centre and leans a little past the axis at the rim — the
cost of curved lines over straight axes. `SECTORS` names each band by its
region, which is what the coaster fills. `tests/unit/chart-geometry.test.ts`
holds the generator to the six-line figure it replaced and fails if the
sector count stops matching the regions. The monogram now draws the same four
lines and the same band from that generator (`markGeometry`, `src/lib/mark.ts`),
stretched to a disc as the coaster is.

## The personal coaster is the user's QR code

*Built* in Settings (`#code`), drawn by `MapCode.tsx` — the code on a quiet
square over the member's map — with the URL and the code in
`src/lib/coaster.ts`. Printing the page prints the figure alone, the size of
a coaster (`[data-print]` in `globals.css`). It needs
no bar, and it is the Overlap's way into the world.

- A coaster drawn from a member's palate: their map, their taste as ground,
  with the QR code at the centre. (It was the cotidal chart with their region's band filled; a
  person is no longer given a region.)
- **The QR code is their profile.** It encodes the public URL of their map,
  so one code is both the thing you print and the way someone sees who you
  are. Scanned by a stranger, it shows the map, as `/p/<handle>`
  does today. Scanned by a signed-in member, it shows both coordinates, the
  distance and three drinks (`src/lib/overlap.ts`) — two people at the same bar
  comparing coasters.
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

Retired with the regions as an identity: a person is described by their
terrain, not a region, so a coaster that names one says less than it seems
to. Its page and its link from each region's page are gone.

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

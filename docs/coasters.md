# Coasters

The four-sector chart, the member's coaster and the region coasters are
built. Venue coasters and print are notes for later.

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
region prose, `quadrants` in `copy.ts`, `formerQuadrantIds` redirects and
tests.

*Done.* The landing chart has four cotidal lines three hours apart (0h /
3h / 6h / 9h), drawn from `src/lib/chart-geometry.ts`. Each line leaves the
centre along an axis and sweeps toward the ring, so a band is exactly a
region near the centre and leans a little past the axis at the rim — the
cost of curved lines over straight axes. `SECTORS` names each band by its
region, which is what the coaster fills. `tests/chart-geometry.spec.ts`
holds the generator to the six-line figure it replaced and fails if the
sector count stops matching the regions. The monogram already read as four
(three lines and the C's opening), so only its comment changed.

## The personal coaster is the user's QR code

*Built* at `/p/<did>/code` (`src/pages/p/[actor]/code.astro`), drawn by
`Coaster.astro`, with the URL and the code in `src/lib/coaster.ts`. It needs
no bar, and it is the Overlap's way into the world.

- A coaster drawn from a member's palate: their region's band filled, with
  a QR code at the amphidrome (the centre point).
- **The QR code is their profile.** It encodes the public URL of their map,
  so one code is both the thing you print and the way someone sees who you
  are. Scanned by a stranger, it shows the map, as `/p/<handle>`
  does today. Scanned by a signed-in member, it shows both coordinates, the
  distance and three drinks (`src/lib/overlap.ts`) — two people at the same bar
  comparing coasters.
- It is on screen, not only in print: "Make my code", under the link on the
  member's own map, opens it, so the coaster and the phone are the same
  object. Anyone else asking for that page gets a 404.
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

- **Print the band, not the dot.** The dot moves with every pour; a printed
  one goes stale, and enough pours can carry it into another region. The
  coaster shows the member's region band only. The exact coordinate is on the
  live page the code opens.
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

*Built* at `/regions/<id>/coaster`, linked from each region page. The region's
band is filled and the code opens the region's page: "which one did you get?"
starts the conversation, and the page it opens leads to the questions. Public
and cached; server-rendered rather than prerendered only so the code can use
the request's origin. Placing each region's drinks on the rings is still to do.

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
inside the ring, no moon.

## Later

- **Venue coasters.** A bar's menu placed on the chart, with a QR code to its
  published menu. Waits on menu capture and venue claim (roadmap 4 and 7,
  `docs/venues.md`).
- **Analog quiz.** A blank chart to mark with a pen. A toy rather than a data
  source: it bypasses the elicitation model.

## Not yet

Print. When it matters: standard coasters are about 4″ round pulpboard in one
or two spot colours; the 1px rings need to be at least ~0.25pt, and the
tokens need a spot-colour mapping. If a brand ever sponsors coasters, check US
tied-house rules on what alcohol suppliers may give retailers before doing it.

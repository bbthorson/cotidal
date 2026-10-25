# Coasters

Not built. Notes for when it is.

The logo is a cotidal circle, the landing chart is a circle, and a bar coaster
is a circle. A coaster carrying the chart is the product's mark in the place
the product is used, and eventually something Cotidal can offer bars.

## First: four sectors, not six

The landing chart (`src/components/marketing/ChartFigure.astro`) draws a
12-hour tide with six cotidal lines two hours apart, over the map's two axes.
So it shows six sectors and four quadrants at once, and they do not line up:
the filled band (0h–2h) covers only part of the top-right quadrant. Anyone who
reads the sectors as categories will expect six regions. The monogram
(`Monogram.astro`) has three lines, so there is no single count yet.

**Decision: four.** The map has two axes, so four quadrants come from the
model; six regions would be arbitrary angular slices, and would cost new
region prose, `quadrants` in `copy.ts`, `formerQuadrantIds` redirects and
tests.

- Redraw the chart with four cotidal lines three hours apart (0h / 3h / 6h /
  9h), still an honest semidiurnal tide. Each sector is one region, and the
  filled band reads as *your region* — the meaning `/regions/<id>` already has.
- The cotidal lines curve and the axes are straight, so they only meet at the
  centre and the rim. Either start each line along an axis and let it sweep
  away, or drop the axis lines and let the cotidal lines be the boundaries.
- Bring the monogram to four lines (or four sectors) at the same time.

**Pull the geometry into one module first.** The chart's ellipses and curves
are hand-placed numbers in one `.astro` file. A coaster renderer would be a
second copy — the drift AGENTS.md warns about. One module, read by the
landing figure, the monogram where it can, and every coaster.

## The personal coaster is the user's QR code

Build this first: it needs no bar, and it is the Overlap's way into the
world.

- A coaster drawn from a member's palate: their dot in their region's band,
  with a QR code at the amphidrome (the centre point).
- **The QR code is their profile.** It encodes the public URL of their map
  (`/p/<handle>`), so one code is both the thing you print and the way someone
  sees who you are. Scanned by a stranger, it shows the map, as `/p/<handle>`
  does today. Scanned by a signed-in member, it shows both coordinates, the
  distance and three drinks (`src/lib/overlap.ts`) — two people at the same bar
  comparing coasters.
- It should be on screen too, not only in print: a "show my code" view on
  the member's own map, so the coaster and the phone are the same object.
- The code must work with no app installed, so it is a plain `https:` URL and
  the page it opens stays script-free like `/p/<handle>`.
- Open question: handles can change; DIDs do not. A printed code that should
  outlive a handle change needs a DID-based path that resolves to the current
  handle (or `/p/<handle>` accepting a DID and redirecting).
- Rendering the QR on the server keeps `/p/<handle>` script-free; do not ship
  a client QR library to it.

## Later

- **Region coasters.** Four designs, one per region, each with that region's
  drinks placed on the rings. A bar can stock all four; "which one did you
  get?" starts the conversation.
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

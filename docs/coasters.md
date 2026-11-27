---
summary: A member's code printed as a coaster — the QR code over their map in Settings, what it links to and why, the four-sector chart, and what is open (the code's look, print).
read_when: Touching MapCode, coaster.ts, chart-geometry.ts, printing, or anything a printed code points at.
---

# Coasters

The logo, the chart and a coaster are all circles: a coaster carrying the
chart is the mark where the product is used.

## The member's code

Built in Settings (`#code`): `MapCode.tsx` draws a QR code on a quiet square
over the member's map; the URL and code are `src/lib/map/coaster.ts`.
Printing the page prints the figure alone at coaster size (`[data-print]` in
`globals.css`).

- **The code is their profile:** the public URL of their map. A stranger who
  scans it sees their map; a signed-in member sees the two tastes compared
  (`compareTerrains`).
- **It encodes the DID, never the handle** (`publicMapPath(did)`, `/p/<did>`):
  handles change and a printed code can't be reissued. Keep `/p/<did>`
  working forever once anything is printed.
- **A plain `https:` URL to a script-free page**, so it works with no app;
  the QR is rendered on the server.
- **Members only** (a guest has no DID) and **opt in:** a code in your hand
  at a bar ties you to your account.
- **No tracking in the link** (no `?ref=coaster`): a query string is
  permanent once printed.
- **It prints the ground as it is that day.** Open: whether print wants a
  plainer field.
- **The origin is the request's.** Before anything is printed, the code must
  carry the permanent domain.

## Four sectors

The chart's sectors match the four regions: four index lines three hours
apart (0h/3h/6h/9h) with hairlines between, from one generator
(`src/lib/map/chart-geometry.ts`, `markGeometry`). `SECTORS` names each band;
`tests/unit/chart-geometry.test.ts` fails if the count stops matching the
regions. Region coasters are retired: a person isn't given a region.

## Open

- **The code's look.** A plain QR looks bad. Cheapest first: style a
  standard code at error correction `H` (a drink glyph in the middle, round
  modules, brand inks; still scans with any camera); a custom pattern as
  decoration beside a small plain code (a camera can't read a custom code
  alone); NFC, which belongs with print.
- **Venue coasters:** a bar's menu on the chart with a code to it; waits on
  capture and claim.
- **Print:** ~4″ round pulpboard, one or two spot colours, rings at least
  ~0.25pt, a spot-colour mapping for the tokens. If a brand sponsors coasters,
  check US tied-house rules first.

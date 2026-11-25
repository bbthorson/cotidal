import { explore } from '@/lib/copy';
import { PalateMap, type Ground } from './PalateMap';

/**
 * A member's code drawn over their map: their taste as ground, and the QR
 * code that opens it on a quiet square of card at the centre (docs/coasters.md).
 * It prints on its own, the size of a coaster (`[data-print]` in globals.css),
 * so the coaster is this figure, printed.
 *
 * The code is one SVG path drawn on the server (`qrPath`), so nothing here
 * runs in the browser.
 */
export function MapCode({
  href,
  label,
  ground,
  qr,
}: {
  /** What the code encodes: an absolute URL. */
  href: string;
  /** The accessible name of the drawing. */
  label: string;
  /** Their taste (`terrainOf`, sampled), or null with no palate yet. */
  ground: Ground | null;
  /** The code, in module units (`qrPath`). */
  qr: { size: number; d: string };
}) {
  return (
    <figure data-print data-testid="map-code" data-code={href} aria-label={label} className="map-frame relative border border-foreground">
      <PalateMap label={explore.chartLabel} ground={ground} tide={!ground} />
      <svg
        viewBox={`-2 -2 ${qr.size + 4} ${qr.size + 4}`}
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 w-1/3 -translate-x-1/2 -translate-y-1/2 border border-foreground bg-card"
      >
        <path d={qr.d} className="fill-foreground" shapeRendering="crispEdges" />
      </svg>
    </figure>
  );
}

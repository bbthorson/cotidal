import { encode } from 'uqr';
import { publicMapPath } from './atproto/paths';

/**
 * What a coaster's QR code says, and the code itself (docs/coasters.md).
 *
 * A member's code is their public map by DID — never the handle, which can
 * change after the code is printed — with nothing appended: a query string is
 * permanent once printed, and would tell the page the scan happened in person.
 * The origin is the request's, because the site has no fixed domain yet.
 */
export function memberCodeUrl(origin: string, did: string): string {
  return new URL(publicMapPath(did), origin).href;
}

/** A region coaster's code: the region's page. */
export function regionCodeUrl(origin: string, id: string): string {
  return new URL(`/regions/${id}`, origin).href;
}

/** Where a member's coaster is shown: under their own map, by DID. */
export function coasterPath(did: string): string {
  return `${publicMapPath(did)}/code`;
}

/** Where a region's coaster is shown. */
export function regionCoasterPath(id: string): string {
  return `/regions/${id}/coaster`;
}

/**
 * The code as one SVG path in module units (one unit per module, no border),
 * drawn server-side so the page that shows it ships no script.
 */
export function qrPath(text: string): { size: number; d: string } {
  const { data, size } = encode(text, { ecc: 'M', border: 0 });
  let d = '';
  data.forEach((row, y) => {
    let x = 0;
    while (x < size) {
      if (!row[x]) {
        x++;
        continue;
      }
      const start = x;
      while (x < size && row[x]) x++;
      d += `M${start} ${y}h${x - start}v1h${start - x}z`;
    }
  });
  return { size, d };
}

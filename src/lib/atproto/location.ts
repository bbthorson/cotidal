/**
 * A place as `community.lexicon.location.geo`: the Lexicon Community's shape
 * for a WGS84 point, so any app speaking that vocabulary reads where a pour
 * was drunk the same way. Checked against the published lexicon
 * (github.com/lexicon-community/lexicon, community/lexicon/location/geo.json):
 * `latitude` and `longitude` are required strings — the AT Protocol has no
 * floats — and `name` is optional.
 *
 * Browser-safe: the harbour, the pour form and the guest ledger use it too.
 */

export const GEO_TYPE = 'community.lexicon.location.geo';

// A type alias, not an interface, so it fits the records' open location shape.
export type GeoLocation = {
  $type: typeof GEO_TYPE;
  latitude: string;
  longitude: string;
  name?: string;
};

/** Six decimal places: about 11 cm, finer than any bar's door. */
const DECIMALS = 6;

const inRange = (v: unknown, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= max;

/** A geo location for a point, or `null` when the point is not one. */
export function geoLocation(lat: unknown, lon: unknown, name?: string): GeoLocation | null {
  if (!inRange(lat, 90) || !inRange(lon, 180)) return null;
  const trimmed = name?.trim();
  return {
    $type: GEO_TYPE,
    latitude: lat.toFixed(DECIMALS),
    longitude: lon.toFixed(DECIMALS),
    ...(trimmed ? { name: [...trimmed].slice(0, 100).join('') } : {}),
  };
}

/** The point in a record's location, when it is a geo location that parses. */
export function readGeo(location: unknown): { lat: number; lon: number } | null {
  const loc = location as Partial<GeoLocation> | undefined;
  if (loc?.$type !== GEO_TYPE || typeof loc.latitude !== 'string' || typeof loc.longitude !== 'string') return null;
  const lat = Number(loc.latitude);
  const lon = Number(loc.longitude);
  return inRange(lat, 90) && inRange(lon, 180) ? { lat, lon } : null;
}

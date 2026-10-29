/**
 * Bars near a point, from OpenStreetMap through the Overpass API.
 *
 * OpenStreetMap is an open map anyone can query without a key, so Compass can
 * show what is around you before Cotidal knows any bar itself. What it costs
 * is a request to a third party carrying where you are, so the point is
 * rounded first (`ROUND`, about 100 m) and nothing about the request is kept.
 * Nothing here runs until the reader asks for bars near them.
 *
 * The answer is parsed down to what the map draws — `parseOverpass` is pure,
 * so it is tested without the network.
 */

export const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

/** What OpenStreetMap tags a place to drink as. */
const KINDS = ['bar', 'pub', 'biergarten', 'nightclub'] as const;
export type BarKind = (typeof KINDS)[number];

export interface OsmBar {
  /** `node/123` or `way/456`: OpenStreetMap's own id for the place. */
  id: string;
  name: string;
  kind: BarKind;
  /** As OpenStreetMap gives them, in degrees (WGS84). */
  lat: number;
  lon: number;
  /** Metres from where the search was made. */
  distance: number;
}

/** Three decimal places of a degree: about 110 m of latitude. */
const ROUND = 1000;
export const roundPoint = (p: { lat: number; lon: number }) => ({
  lat: Math.round(p.lat * ROUND) / ROUND,
  lon: Math.round(p.lon * ROUND) / ROUND,
});

/** Great-circle distance in metres. */
export function metresBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** The Overpass QL for named drinking places within `radius` metres. */
export function overpassQuery(at: { lat: number; lon: number }, radius: number): string {
  const kinds = KINDS.join('|');
  const around = `(around:${radius},${at.lat},${at.lon})`;
  return `[out:json][timeout:15];(node["amenity"~"^(${kinds})$"]["name"]${around};way["amenity"~"^(${kinds})$"]["name"]${around};);out center 80;`;
}

interface OverpassElement {
  type?: unknown;
  id?: unknown;
  lat?: unknown;
  lon?: unknown;
  center?: { lat?: unknown; lon?: unknown };
  tags?: Record<string, unknown>;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Overpass's answer, parsed down to named bars with a point, nearest first.
 * Anything malformed is dropped rather than trusted: this is a third party's
 * response, drawn on our page.
 */
export function parseOverpass(json: unknown, from: { lat: number; lon: number }, limit = 50): OsmBar[] {
  const elements = (json as { elements?: unknown })?.elements;
  if (!Array.isArray(elements)) return [];
  const bars: OsmBar[] = [];
  for (const el of elements as OverpassElement[]) {
    if ((el.type !== 'node' && el.type !== 'way') || !isNum(el.id)) continue;
    const lat = isNum(el.lat) ? el.lat : el.center?.lat;
    const lon = isNum(el.lon) ? el.lon : el.center?.lon;
    if (!isNum(lat) || !isNum(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    const name = typeof el.tags?.name === 'string' ? el.tags.name.trim().slice(0, 200) : '';
    const kind = el.tags?.amenity;
    if (!name || !KINDS.includes(kind as BarKind)) continue;
    bars.push({ id: `${el.type}/${el.id}`, name, kind: kind as BarKind, lat, lon, distance: metresBetween(from, { lat, lon }) });
  }
  return bars.sort((a, b) => a.distance - b.distance).slice(0, limit);
}

/** Named bars within `radius` metres of a point, rounded before it leaves the device. */
export async function barsNear(
  point: { lat: number; lon: number },
  { radius = 1200, timeoutMs = 15_000 }: { radius?: number; timeoutMs?: number } = {}
): Promise<OsmBar[]> {
  const at = roundPoint(point);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data: overpassQuery(at, radius) }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Overpass answered ${res.status}`);
    // Distances from the true point: it never left the device.
    return parseOverpass(await res.json(), point);
  } finally {
    clearTimeout(timer);
  }
}

/** "120 m", "1.4 km". */
export function formatDistance(metres: number): string {
  return metres < 1000 ? `${Math.round(metres / 10) * 10} m` : `${(metres / 1000).toFixed(1)} km`;
}

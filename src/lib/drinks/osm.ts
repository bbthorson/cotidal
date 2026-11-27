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
export type OsmElementType = 'node' | 'way';

export interface OsmAddress {
  street?: string;
  city?: string;
  state?: string;
  postcode?: string;
  /** Single-line formatted address assembled from `addr:*` tags. */
  formatted: string;
}

export interface OsmBar {
  /** `node/123` or `way/456`: OpenStreetMap's own id for the place. */
  id: string;
  name: string;
  kind: BarKind;
  /** As OpenStreetMap gives them, in degrees (WGS84). */
  lat: number;
  lon: number;
  /** Metres from where the search was made (`0` for direct single-place lookups). */
  distance: number;
  address?: OsmAddress;
  openingHours?: string;
  website?: string;
  menuUrl?: string;
  phone?: string;
  outdoorSeating?: boolean;
  /** Foursquare Open Places id when tagged on OSM (`ref:foursquare` / `foursquare`). */
  fsqId?: string;
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

/** How long Overpass may spend on the query, in seconds; the request waits a little longer. */
const QUERY_TIMEOUT_S = 25;

/** The Overpass QL for named drinking places within `radius` metres. */
export function overpassQuery(at: { lat: number; lon: number }, radius: number): string {
  const kinds = KINDS.join('|');
  const around = `(around:${radius},${at.lat},${at.lon})`;
  return `[out:json][timeout:${QUERY_TIMEOUT_S}];(node["amenity"~"^(${kinds})$"]["name"]${around};way["amenity"~"^(${kinds})$"]["name"]${around};);out center 80;`;
}

/** Overpass QL for fetching one specific OSM node or way by id. */
export function overpassElementQuery(type: OsmElementType, id: number): string {
  return `[out:json][timeout:15];${type}(${id});out center 1;`;
}

/** Validate route params for `/v/osm/<type>/<id>`. */
export function parseOsmParams(
  type: string | undefined,
  id: string | undefined
): { type: OsmElementType; id: number } | null {
  if (type !== 'node' && type !== 'way') return null;
  if (!id || !/^\d{1,15}$/.test(id)) return null;
  const parsed = Number(id);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return null;
  return { type, id: parsed };
}

/** Route path for an unclaimed OSM place (`node/123` -> `/v/osm/node/123`). */
export function osmPlaceHref(osmId: string): string | null {
  const [type, id] = osmId.split('/');
  const parsed = parseOsmParams(type, id);
  return parsed ? `/v/osm/${parsed.type}/${parsed.id}` : null;
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

const tagStr = (tags: Record<string, unknown> | undefined, key: string, max = 200): string | undefined => {
  const v = tags?.[key];
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
};

function safeHttpUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const candidate = /^www\./i.test(raw) ? `https://${raw}` : raw;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function parseAddress(tags: Record<string, unknown> | undefined): OsmAddress | undefined {
  const full = tagStr(tags, 'addr:full', 300);
  const house = tagStr(tags, 'addr:housenumber', 40);
  const streetName = tagStr(tags, 'addr:street', 160);
  const unit = tagStr(tags, 'addr:unit', 40);
  const city = tagStr(tags, 'addr:city', 120);
  const state = tagStr(tags, 'addr:state', 60);
  const postcode = tagStr(tags, 'addr:postcode', 30);

  const streetParts = [house, streetName].filter(Boolean).join(' ');
  const street = streetParts ? (unit ? `${streetParts} ${unit}` : streetParts) : undefined;
  const locality = [city, [state, postcode].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const formatted = full ?? [street, locality].filter(Boolean).join(', ');
  if (!formatted) return undefined;

  return {
    ...(street ? { street } : {}),
    ...(city ? { city } : {}),
    ...(state ? { state } : {}),
    ...(postcode ? { postcode } : {}),
    formatted,
  };
}

function parseOutdoorSeating(raw: string | undefined): boolean | undefined {
  if (!raw) return undefined;
  const v = raw.toLowerCase();
  if (['yes', 'true', 'terrace', 'patio', 'sidewalk', 'garden', 'courtyard', 'rooftop'].includes(v)) return true;
  if (['no', 'false'].includes(v)) return false;
  return undefined;
}

function parseFsqId(tags: Record<string, unknown> | undefined): string | undefined {
  const raw = tagStr(tags, 'ref:foursquare', 64) ?? tagStr(tags, 'foursquare', 64);
  return raw && /^[A-Za-z0-9_-]{8,64}$/.test(raw) ? raw : undefined;
}

function parseElement(
  el: OverpassElement,
  from: { lat: number; lon: number } | null,
  requireDrinkingAmenity: boolean
): OsmBar | null {
  if ((el.type !== 'node' && el.type !== 'way') || !isNum(el.id)) return null;
  const lat = isNum(el.lat) ? el.lat : el.center?.lat;
  const lon = isNum(el.lon) ? el.lon : el.center?.lon;
  if (!isNum(lat) || !isNum(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;

  const tags = el.tags;
  const name = tagStr(tags, 'name', 200);
  if (!name) return null;

  const rawAmenity = tags?.amenity;
  const isDrinkingKind = KINDS.includes(rawAmenity as BarKind);
  if (requireDrinkingAmenity && !isDrinkingKind) return null;
  const kind: BarKind = isDrinkingKind ? (rawAmenity as BarKind) : 'bar';

  const address = parseAddress(tags);
  const openingHours = tagStr(tags, 'opening_hours', 300);
  const website = safeHttpUrl(tagStr(tags, 'website', 500) ?? tagStr(tags, 'contact:website', 500));
  const menuUrl = safeHttpUrl(tagStr(tags, 'website:menu', 500));
  const phone = tagStr(tags, 'phone', 60) ?? tagStr(tags, 'contact:phone', 60);
  const outdoorSeating = parseOutdoorSeating(tagStr(tags, 'outdoor_seating', 40));
  const fsqId = parseFsqId(tags);

  return {
    id: `${el.type}/${el.id}`,
    name,
    kind,
    lat,
    lon,
    distance: from ? metresBetween(from, { lat, lon }) : 0,
    ...(address ? { address } : {}),
    ...(openingHours ? { openingHours } : {}),
    ...(website ? { website } : {}),
    ...(menuUrl ? { menuUrl } : {}),
    ...(phone ? { phone } : {}),
    ...(outdoorSeating !== undefined ? { outdoorSeating } : {}),
    ...(fsqId ? { fsqId } : {}),
  };
}

/**
 * Overpass reports a query it gave up on (timed out, out of memory) as a 200
 * with a `remark` and whatever elements it had — usually none. Read as an
 * answer, that would say "no bars here" when the truth is "no answer".
 */
export function overpassFailure(json: unknown): string | null {
  const remark = (json as { remark?: unknown })?.remark;
  return typeof remark === 'string' && /error/i.test(remark) ? remark : null;
}

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
    const parsed = parseElement(el, from, true);
    if (parsed) bars.push(parsed);
  }
  return bars.sort((a, b) => a.distance - b.distance).slice(0, limit);
}

/** Parse a single-element Overpass response for `/v/osm/<type>/<id>`. */
export function parseOverpassElement(json: unknown): OsmBar | null {
  const elements = (json as { elements?: unknown })?.elements;
  if (!Array.isArray(elements) || elements.length === 0) return null;
  return parseElement(elements[0] as OverpassElement, null, false);
}

export type OsmBarResult =
  | { status: 'ok'; bar: OsmBar }
  | { status: 'not-found' }
  | { status: 'unavailable' };

/** Fetch one OpenStreetMap place by element type and id. */
export async function fetchOsmBar(
  type: OsmElementType,
  id: number,
  options: { timeoutMs?: number; fetch?: typeof fetch } = {}
): Promise<OsmBarResult> {
  const { timeoutMs = 15_000, fetch: fetchFn = fetch } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchFn(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data: overpassElementQuery(type, id) }),
      signal: controller.signal,
    });
    if (!res.ok) return { status: 'unavailable' };
    const json: unknown = await res.json();
    if (overpassFailure(json)) return { status: 'unavailable' };
    const bar = parseOverpassElement(json);
    return bar ? { status: 'ok', bar } : { status: 'not-found' };
  } catch {
    return { status: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}

/** Named bars within `radius` metres of a point, rounded before it leaves the device. */
export async function barsNear(
  point: { lat: number; lon: number },
  { radius = 1200, timeoutMs = (QUERY_TIMEOUT_S + 5) * 1000 }: { radius?: number; timeoutMs?: number } = {}
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
    const json: unknown = await res.json();
    const failure = overpassFailure(json);
    if (failure) throw new Error(`Overpass gave up: ${failure}`);
    // Distances from the true point: it never left the device.
    return parseOverpass(json, point);
  } finally {
    clearTimeout(timer);
  }
}

/** "120 m", "1.4 km". */
export function formatDistance(metres: number): string {
  return metres < 1000 ? `${Math.round(metres / 10) * 10} m` : `${(metres / 1000).toFixed(1)} km`;
}

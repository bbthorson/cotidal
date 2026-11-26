import { isValidDid, isValidHandle } from '@atproto/syntax';
import type { Drink } from './data';
import { drinkOf } from './drink-match';
import { QUADRANT_ORDER, type QuadrantId } from './quadrant';

/**
 * The map's address: the path picks the card, the parameters pick what the
 * map draws (docs/map-first.md, The map's address). One vocabulary, read and
 * written here and nowhere else:
 *
 * - `drink=<slug>` — a drink marked on the map, its card open.
 * - `region=<id>` — a region washed on the map, its drinks named, and the
 *   region in the card (`regionPath`): a filter on the drinks, not a page.
 * - `palate=<handle or DID>` — whose taste the map draws and the card speaks
 *   for: someone else's, read from their public records, read-only. Without
 *   it, yours (your account, or this device).
 * - `with=<handle or DID>` — a second taste over the first, to compare them.
 *   On someone's map a signed-in reader is compared with by default; `with=`
 *   names anyone, so a comparison of two other people is a link too.
 *
 * They combine: `/map?palate=alice.bsky.social&drink=negroni` is where a
 * Negroni sits for Alice. Rating links (`?rate=`, `?draft=1&…`,
 * `pour-draft.ts`) carry their own `drink=` for the pour; on those, `drink=`
 * belongs to the pour, not the view.
 *
 * Every value is checked as the rest of the code checks it: a drink through
 * `drinkOf` (by slug, then by name), a person by the protocol's own handle and
 * DID syntax. A value that does not check is dropped, never guessed at.
 */
export const VIEW_PARAMS = { drink: 'drink', region: 'region', palate: 'palate', with: 'with' } as const;

export interface MapView {
  /** The drink the view is about, or null. */
  drink: Drink | null;
  /** The region the map is narrowed to, or null. */
  region: QuadrantId | null;
  /** Whose palate the map draws: a handle (lower case, no `@`) or a DID, or null for yours. */
  palate: string | null;
  /** A second palate to compare with, the same way; null for none named. */
  with: string | null;
}

/** A handle or a DID as typed into an address: `@Alice.bsky.social` reads as `alice.bsky.social`. */
export function actorParam(value: string | null | undefined): string | null {
  const v = (value ?? '').normalize('NFKC').trim().replace(/^@/, '');
  if (!v) return null;
  if (v.startsWith('did:')) return isValidDid(v) ? v : null;
  const handle = v.toLowerCase();
  return isValidHandle(handle) ? handle : null;
}

/** A region id as typed into an address, or null: only the four the map has. */
export function regionParam(value: string | null | undefined): QuadrantId | null {
  const v = (value ?? '').trim().toLowerCase();
  return (QUADRANT_ORDER as readonly string[]).includes(v) ? (v as QuadrantId) : null;
}

/** What an address asks the map to draw. */
export function readMapView(params: URLSearchParams): MapView {
  const rating = params.has('rate') || params.get('draft') === '1';
  const drinkValue = rating ? '' : (params.get(VIEW_PARAMS.drink) ?? '').trim();
  return {
    drink: drinkValue ? drinkOf({ slug: drinkValue, name: drinkValue }) : null,
    region: regionParam(params.get(VIEW_PARAMS.region)),
    palate: actorParam(params.get(VIEW_PARAMS.palate)),
    with: actorParam(params.get(VIEW_PARAMS.with)),
  };
}

/**
 * An address for a view: `path` with the parameters in one order, so the
 * same view is always the same link. A drink is written by its slug, which
 * never changes once a record points at it.
 */
export function viewHref(
  path: string,
  view: { drink?: Pick<Drink, 'slug'> | string | null; region?: QuadrantId | null; palate?: string | null; with?: string | null }
): string {
  const params = new URLSearchParams();
  const slug = typeof view.drink === 'string' ? view.drink : view.drink?.slug;
  if (slug) params.set(VIEW_PARAMS.drink, slug);
  const region = regionParam(view.region);
  if (region) params.set(VIEW_PARAMS.region, region);
  const palate = actorParam(view.palate);
  if (palate) params.set(VIEW_PARAMS.palate, palate);
  const other = actorParam(view.with);
  if (other) params.set(VIEW_PARAMS.with, other);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

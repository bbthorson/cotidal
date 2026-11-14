/**
 * Bars as atproto Spaces: the addressing, policy and scopes for
 * `app.cotidal.bar`, and nothing that talks to a server yet. Why a bar is a
 * space, and what waits on the Spaces public beta, is docs/spaces.md.
 *
 * Everything here is derived, never stored: a venue's space is its DID plus
 * the space type plus `self`, so no record carries a space reference that
 * could disagree with the venue it names.
 *
 * URIs are put together from parts checked by `@atproto/syntax`, the
 * protocol's reference implementation; the released version does not parse
 * space URIs yet, so `tests/spaces.spec.ts` holds these functions equal to
 * the Spaces alpha of that package.
 */
import { isValidDid, isValidNsid, isValidRecordKey } from '@atproto/syntax';
import { BAR_SPACE_KEY, BAR_SPACE_TYPE, POUR_COLLECTION } from './vocab.ts';
import type { VenueRef } from './records.ts';

/** The literal path segment that marks a URI as addressing a space. */
const SPACE_MARKER = 'space';

/** `at://{spaceDid}/space/{spaceType}/{skey}` */
export type SpaceRefString = `at://${string}/space/${string}/${string}`;

export interface SpaceRefParts {
  spaceDid: string;
  spaceType: string;
  skey: string;
}

export interface SpaceRecordParts extends SpaceRefParts {
  authorDid: string;
  collection: string;
  rkey: string;
}

function checkRef({ spaceDid, spaceType, skey }: SpaceRefParts): void {
  if (!isValidDid(spaceDid)) throw new Error(`space authority is not a DID: ${spaceDid}`);
  if (!isValidNsid(spaceType)) throw new Error(`space type is not an NSID: ${spaceType}`);
  if (!isValidRecordKey(skey)) throw new Error(`space key is not valid: ${skey}`);
}

export function formatSpaceRef(parts: SpaceRefParts): SpaceRefString {
  checkRef(parts);
  return `at://${parts.spaceDid}/${SPACE_MARKER}/${parts.spaceType}/${parts.skey}`;
}

export function formatSpaceRecordUri(parts: SpaceRecordParts): string {
  checkRef(parts);
  if (!isValidDid(parts.authorDid)) throw new Error(`record author is not a DID: ${parts.authorDid}`);
  if (!isValidNsid(parts.collection)) throw new Error(`collection is not an NSID: ${parts.collection}`);
  if (!isValidRecordKey(parts.rkey)) throw new Error(`record key is not valid: ${parts.rkey}`);
  return `${formatSpaceRef(parts)}/${parts.authorDid}/${parts.collection}/${parts.rkey}`;
}

/**
 * A space URI's parts, or null. Accepts a space ref (four segments after
 * `at://`) or a record within one (seven). Authority and author must be
 * DIDs — membership is keyed on them, so unlike a public URI neither may be a
 * handle. No query, fragment or trailing slash.
 */
export function parseSpaceUri(uri: string): SpaceRefParts | SpaceRecordParts | null {
  if (!uri.startsWith('at://') || /[?#]/.test(uri)) return null;
  const segments = uri.slice('at://'.length).split('/');
  const [spaceDid, marker, spaceType, skey, authorDid, collection, rkey] = segments;
  if (marker !== SPACE_MARKER || (segments.length !== 4 && segments.length !== 7)) return null;
  const ref = { spaceDid, spaceType, skey };
  try {
    if (segments.length === 4) {
      formatSpaceRef(ref);
      return ref;
    }
    const record = { ...ref, authorDid, collection, rkey };
    formatSpaceRecordUri(record);
    return record;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// The bar space
// ---------------------------------------------------------------------------

/** The one space a venue has. Its authority is the venue's own DID. */
export function barSpace(venueDid: string): SpaceRefString {
  return formatSpaceRef({ spaceDid: venueDid, spaceType: BAR_SPACE_TYPE, skey: BAR_SPACE_KEY });
}

/** The venue whose bar space this is, or null for any other URI. */
export function barSpaceVenue(uri: string): string | null {
  const parts = parseSpaceUri(uri);
  if (!parts || 'authorDid' in parts) return null;
  return parts.spaceType === BAR_SPACE_TYPE && parts.skey === BAR_SPACE_KEY ? parts.spaceDid : null;
}

/**
 * Where a pour at this venue could be shared, or null when the reference
 * names no account. A DID in a pour's venue ref is what its author wrote, not
 * proof of a claim: the venue's `app.cotidal.venue` at `self` is the claim,
 * and the venue's host saying the space exists is what makes it writable.
 */
export function candidateBarSpace(venue: VenueRef | undefined): SpaceRefString | null {
  const did = venue?.entity.did;
  return did && isValidDid(did) ? barSpace(did) : null;
}

/** A patron's pour as shared with a bar: in the patron's own space repo. */
export function barPourUri(venueDid: string, patronDid: string, rkey: string): string {
  return formatSpaceRecordUri({
    spaceDid: venueDid,
    spaceType: BAR_SPACE_TYPE,
    skey: BAR_SPACE_KEY,
    authorDid: patronDid,
    collection: POUR_COLLECTION,
    rkey,
  });
}

/**
 * A pour belongs in a bar's space only if it names that bar. The space is the
 * patron telling *this* bar something; a pour at another bar, or at no bar,
 * written into it would show the venue a visit that never happened there.
 */
export function pourBelongsInBarSpace(pour: { venue?: VenueRef }, space: string): boolean {
  const venueDid = barSpaceVenue(space);
  return venueDid !== null && pour.venue?.entity.did === venueDid;
}

/**
 * The policy a venue creates its space with (`com.atproto.space.createSpace`).
 * One of the three every PDS must support, so no Cotidal service sits in the
 * access path:
 *
 * - `publicWrite`: any patron may share a pour without the venue first adding
 *   them — the venue's host tracks their repo and tells syncers about it.
 * - not `publicRead`: patrons write and do not read. What one patron tells
 *   the bar, the next patron does not see. Reading is for the venue and for
 *   the staff it adds as members (`BAR_STAFF_MEMBER`).
 * - no `allowedApps`: the venue may read its own space with any client — a
 *   point-of-sale system, not only Cotidal.
 * - `publishPolicy`: staff can see how the space is configured.
 *   `publishMembers` stays off; the staff list is the venue's business.
 */
export const BAR_SPACE_POLICY = {
  $type: 'com.atproto.memberspace.policy',
  publicRead: false,
  publicWrite: true,
  publishPolicy: true,
  publishMembers: false,
} as const;

/** A member entry (`putMembers`) for someone who works the bar. */
export const BAR_STAFF_MEMBER = { read: true, write: true } as const;

// ---------------------------------------------------------------------------
// OAuth scopes (`space:<type>?…`). Not requested yet: sign-in asks for
// `transition:generic`, and a PDS before the beta does not know these.
// ---------------------------------------------------------------------------

type SpaceAction = 'read_self' | 'read' | 'create' | 'update' | 'delete';
type SpaceManage = 'create' | 'update' | 'delete';

export function spaceScope(
  spaceType: string,
  opts: {
    authority?: string;
    skey?: string;
    collections?: string[];
    actions?: SpaceAction[];
    manage?: SpaceManage[];
  } = {},
): string {
  if (!isValidNsid(spaceType)) throw new Error(`space type is not an NSID: ${spaceType}`);
  const params: string[] = [];
  if (opts.authority) params.push(`authority=${opts.authority}`);
  if (opts.skey) params.push(`skey=${opts.skey}`);
  for (const c of opts.collections ?? []) params.push(`collection=${c}`);
  for (const a of opts.actions ?? []) params.push(`action=${a}`);
  for (const m of opts.manage ?? []) params.push(`manage=${m}`);
  return params.length ? `space:${spaceType}?${params.join('&')}` : `space:${spaceType}`;
}

/** A patron: share pours into any bar's space, see and take back their own. */
export const PATRON_BAR_SCOPE = spaceScope(BAR_SPACE_TYPE, {
  authority: '*',
  collections: [POUR_COLLECTION],
  actions: ['read_self', 'create', 'delete'],
});

/** A venue: open, adjust and close its own space, and read what is in it. */
export const VENUE_BAR_SCOPE = spaceScope(BAR_SPACE_TYPE, {
  actions: ['read'],
  manage: ['create', 'update', 'delete'],
});

/** Staff: read the spaces of the bars that have added them. */
export const STAFF_BAR_SCOPE = spaceScope(BAR_SPACE_TYPE, { authority: '*', actions: ['read'] });

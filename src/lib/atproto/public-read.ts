import { z } from 'zod';
import { type AtprotoDidDocument, didDocumentValidator, extractAtprotoData } from '@atproto/did';
import { isValidHandle, normalizeHandle } from '@bbthorson/atproto-cf-auth/server';
import { PALATE_COLLECTION, PALATE_RKEY, decodeCoordinates } from './records';
import { lexInteger } from './lex-string';
import { readPublicTaste, type PublicTaste, type TasteCache } from './public-taste';
import { samplePerson, sampleRepository } from './sample-people';

/**
 * Reading someone else's palate, with no session.
 *
 * A palate record is public by construction — it lives in the author's
 * repository — so drawing it needs no permission, only the three lookups any
 * AT Protocol client makes: handle → DID, DID → document (which names the
 * PDS), then the record from that PDS.
 *
 * This runs on a public route, so every input is a stranger's: the actor in
 * the URL, the DID document, and the record itself. Lookups are time-boxed,
 * only `https:` hosts are fetched, and the record is parsed down to the
 * fields the page draws rather than trusted as a `PalateRecord`.
 */

const TIMEOUT_MS = 4000;
const MAX_BYTES = 64 * 1024;
/** A page of records (`listRecords`) is many records: allowed more, and still bounded. */
const MAX_LIST_BYTES = 512 * 1024;

const DEFAULT_HANDLE_RESOLVER = 'https://public.api.bsky.app';
const PLC_DIRECTORY = 'https://plc.directory';

/**
 * TLDs the handle spec reserves. They can never resolve, so they are refused
 * before any network call — which also makes them a deterministic way for
 * tests to reach the not-found path offline.
 */
const RESERVED_TLDS = new Set([
  'alt',
  'arpa',
  'example',
  'internal',
  'invalid',
  'local',
  'localhost',
  'onion',
  'test',
]);

/**
 * The fields of `app.cotidal.palate` this page uses, and nothing else.
 * The coordinate is read by `decodeCoordinates`.
 */
const PublicPalateSchema = z.object({
  aversions: z
    .object({
      smoke: z.boolean().optional(),
      bitter: z.boolean().optional(),
      anise: z.boolean().optional(),
    })
    .partial()
    .optional(),
  dynamicState: z.object({ eventCount: lexInteger().min(0) }).partial().optional(),
  updatedAt: z.string().optional(),
  createdAt: z.string().optional(),
});

export interface PublicPalate {
  x: number;
  y: number;
  aversions: { smoke: boolean; bitter: boolean; anise: boolean };
  /** Pours the filter has processed, when the record says. */
  pours: number | null;
  updatedAt: string | null;
}

export interface PublicActor {
  did: string;
  /** Only a handle the DID document confirms; otherwise `null`. */
  handle: string | null;
  /** A made-up person (`sample-people.ts`), whose page says so. */
  sample?: true;
}

export type PublicPalateResult =
  | { status: 'invalid' }
  | { status: 'not-found' }
  | { status: 'unavailable'; actor: PublicActor | null }
  | { status: 'no-palate'; actor: PublicActor }
  | {
      status: 'ok';
      actor: PublicActor;
      palate: PublicPalate;
      /** Their questions and pours, when asked for (`taste: true`); `null` when they could not be read. */
      taste?: PublicTaste | null;
    };

export interface ReadOptions {
  fetch?: typeof fetch;
  /** XRPC host for `resolveHandle`; the auth package honours the same variable. */
  handleResolver?: string;
  /** Also read their taste (`public-taste.ts`): what the map draws as their terrain. */
  taste?: boolean;
  /** Where a taste is cached; the Workers cache by default (`defaultTasteCache`). */
  tasteCache?: TasteCache | null;
}

/** Thrown for a lookup that failed for reasons other than "it does not exist". */
class Unavailable extends Error {}

/** `@alice.example.com`, `alice` (→ `alice.bsky.social`) or a DID, as typed in a URL. */
export function parseActor(input: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(input);
  } catch {
    return null;
  }
  const actor = normalizeHandle(decoded);
  if (!actor || !isValidHandle(actor)) return null;
  if (!actor.startsWith('did:')) {
    const tld = actor.slice(actor.lastIndexOf('.') + 1);
    if (RESERVED_TLDS.has(tld)) return null;
  }
  return actor;
}

/** Only public https hosts: no loopback, no IP literals, no credentials. */
function safeUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  const host = url.hostname;
  if (host === 'localhost' || host.endsWith('.localhost')) return null;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.startsWith('[')) return null;
  return url;
}

async function getJson(
  url: URL,
  fetchImpl: typeof fetch,
  maxBytes = MAX_BYTES
): Promise<{ status: number; body: unknown }> {
  let res: Response;
  try {
    res = await fetchImpl(url.toString(), {
      headers: { accept: 'application/json' },
      // Workers support only 'follow' and 'manual'. A redirect is not followed
      // to wherever it points; it reads as a non-OK answer.
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new Unavailable(`fetch failed: ${url.host}`);
  }
  if (!res.ok) return { status: res.status, body: null };
  const text = await res.text();
  if (text.length > maxBytes) throw new Unavailable(`response too large: ${url.host}`);
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    throw new Unavailable(`not JSON: ${url.host}`);
  }
}

interface ResolvedDid {
  pds: URL;
  /** The handle the document claims — unverified until it resolves back. */
  claimedHandle: string | null;
}

async function resolveDidDoc(did: string, fetchImpl: typeof fetch): Promise<ResolvedDid | null> {
  let docUrl: URL | null;
  if (did.startsWith('did:plc:')) {
    docUrl = safeUrl(`${PLC_DIRECTORY}/${did}`);
  } else if (did.startsWith('did:web:')) {
    // Host-only did:web; a path form has no `.well-known` document.
    const host = decodeURIComponent(did.slice('did:web:'.length));
    if (host.includes(':') || host.includes('/')) return null;
    docUrl = safeUrl(`https://${host}/.well-known/did.json`);
  } else {
    return null;
  }
  if (!docUrl) return null;

  const { status, body } = await getJson(docUrl, fetchImpl);
  if (status === 404 || status === 410) return null;
  if (!body) throw new Unavailable(`DID document ${status}`);

  // The reference validator, not a hand-written shape: it checks the DID
  // document as atproto defines it, and finds `#atproto_pds` the way every
  // other atproto client does.
  const doc = didDocumentValidator.safeParse(body);
  if (!doc.success || doc.data.id !== did) return null;

  // `id` is the did:plc / did:web asked for, so the document is an atproto one.
  const atproto = extractAtprotoData(doc.data as AtprotoDidDocument);
  const pds = atproto.pds ? safeUrl(atproto.pds.serviceEndpoint) : null;
  if (!pds) return null;

  const claimed = atproto.aka ? normalizeHandle(atproto.aka, { defaultDomain: '' }) : null;
  return { pds, claimedHandle: claimed && isValidHandle(claimed) ? claimed : null };
}

async function resolveHandle(
  handle: string,
  fetchImpl: typeof fetch,
  resolver: string
): Promise<string | null> {
  const base = safeUrl(resolver);
  if (!base) throw new Unavailable('handle resolver is not https');
  const url = new URL('/xrpc/com.atproto.identity.resolveHandle', base);
  url.searchParams.set('handle', handle);
  const { status, body } = await getJson(url, fetchImpl);
  // resolveHandle answers 400 for a handle that does not resolve.
  if (status === 400 || status === 404) return null;
  const did = (body as { did?: unknown } | null)?.did;
  if (typeof did !== 'string') throw new Unavailable(`resolveHandle ${status}`);
  return isValidHandle(did) && did.startsWith('did:') ? did : null;
}

/**
 * Resolve a domain/handle to its AT Protocol DID using the same safe HTTPS
 * resolver as `resolvePublicRepo`. Returns `{ status: 'ok', did }` (null if
 * unresolved) or `{ status: 'unavailable' }` on network/resolver failure.
 */
export async function resolveHandleToDid(
  handle: string,
  options: ReadOptions = {}
): Promise<{ status: 'ok'; did: string | null } | { status: 'unavailable' }> {
  const fetchImpl = options.fetch ?? fetch;
  const resolver =
    options.handleResolver ?? process.env.ATPROTO_HANDLE_RESOLVER ?? DEFAULT_HANDLE_RESOLVER;
  try {
    const did = await resolveHandle(handle, fetchImpl, resolver);
    return { status: 'ok', did };
  } catch {
    return { status: 'unavailable' };
  }
}

function toPalate(value: unknown): PublicPalate | null {
  const point = decodeCoordinates(value);
  const parsed = PublicPalateSchema.safeParse(value);
  if (!point || !parsed.success) return null;
  const r = parsed.data;
  return {
    x: point.x,
    y: point.y,
    aversions: {
      smoke: r.aversions?.smoke ?? false,
      bitter: r.aversions?.bitter ?? false,
      anise: r.aversions?.anise ?? false,
    },
    pours: r.dynamicState?.eventCount ?? null,
    updatedAt: r.updatedAt ?? r.createdAt ?? null,
  };
}

export type PublicRepoResult =
  | { status: 'invalid' }
  | { status: 'not-found' }
  | { status: 'unavailable'; actor: PublicActor | null }
  | {
      status: 'ok';
      actor: PublicActor;
      pds: URL;
      getRecord(collection: string, rkey: string): Promise<{ status: number; value: unknown | null }>;
      /** One page of a collection, newest first: the records' values, and where the next page starts. */
      listRecords(collection: string, page?: { limit?: number; cursor?: string }): Promise<{ values: unknown[]; cursor: string | null }>;
      /** The repository's latest revision, which changes whenever anything in it does; `null` when the PDS will not say. */
      latestRev(): Promise<string | null>;
    };

/**
 * Resolve an actor (handle or DID) to its verified DID, confirmed handle, and
 * PDS endpoint, returning a safe `getRecord` reader for public records.
 */
export async function resolvePublicRepo(
  input: string,
  options: ReadOptions = {}
): Promise<PublicRepoResult> {
  const fetchImpl = options.fetch ?? fetch;
  const resolver =
    options.handleResolver ?? process.env.ATPROTO_HANDLE_RESOLVER ?? DEFAULT_HANDLE_RESOLVER;

  // A made-up person on a `.test` handle, read from the records the app carries for them, with no network.
  let decodedInput = input;
  try {
    decodedInput = decodeURIComponent(input);
  } catch {
    /* parsed below */
  }
  const sample = samplePerson(decodedInput);
  if (sample) {
    return {
      status: 'ok',
      actor: { did: sample.person.did, handle: sample.handle, sample: true },
      pds: new URL('https://sample.cotidal.invalid'),
      ...sampleRepository(sample.person),
    };
  }

  const actorId = parseActor(input);
  if (!actorId) return { status: 'invalid' };

  let actor: PublicActor | null = null;
  try {
    const did = actorId.startsWith('did:') ? actorId : await resolveHandle(actorId, fetchImpl, resolver);
    if (!did) return { status: 'not-found' };

    const doc = await resolveDidDoc(did, fetchImpl);
    if (!doc) return { status: 'not-found' };

    // A handle counts only when both directions agree: the document claims it
    // and it resolves to this DID. Arriving by handle proves the second half.
    let handle: string | null = null;
    if (doc.claimedHandle) {
      if (!actorId.startsWith('did:')) {
        handle = doc.claimedHandle === actorId ? actorId : null;
      } else {
        const back = await resolveHandle(doc.claimedHandle, fetchImpl, resolver).catch(() => null);
        handle = back === did ? doc.claimedHandle : null;
      }
    }
    actor = { did, handle };

    const getRecord = async (collection: string, rkey: string) => {
      const recordUrl = new URL('/xrpc/com.atproto.repo.getRecord', doc.pds);
      recordUrl.searchParams.set('repo', did);
      recordUrl.searchParams.set('collection', collection);
      recordUrl.searchParams.set('rkey', rkey);
      const { status, body } = await getJson(recordUrl, fetchImpl);
      if (status === 400 || status === 404) return { status, value: null };
      if (!body) throw new Unavailable(`getRecord ${status}`);
      return { status, value: (body as { value?: unknown }).value ?? null };
    };

    const listRecords = async (collection: string, page: { limit?: number; cursor?: string } = {}) => {
      const listUrl = new URL('/xrpc/com.atproto.repo.listRecords', doc.pds);
      listUrl.searchParams.set('repo', did);
      listUrl.searchParams.set('collection', collection);
      listUrl.searchParams.set('limit', String(Math.max(1, Math.min(100, page.limit ?? 100))));
      if (page.cursor) listUrl.searchParams.set('cursor', page.cursor);
      const { status, body } = await getJson(listUrl, fetchImpl, MAX_LIST_BYTES);
      if (status === 400 || status === 404) return { values: [], cursor: null };
      if (!body) throw new Unavailable(`listRecords ${status}`);
      const b = body as { records?: unknown; cursor?: unknown };
      const values = Array.isArray(b.records) ? b.records.map((r) => (r as { value?: unknown })?.value ?? null) : [];
      return { values, cursor: typeof b.cursor === 'string' && b.cursor ? b.cursor : null };
    };

    const latestRev = async () => {
      const revUrl = new URL('/xrpc/com.atproto.sync.getLatestCommit', doc.pds);
      revUrl.searchParams.set('did', did);
      const { body } = await getJson(revUrl, fetchImpl).catch(() => ({ body: null }));
      const rev = (body as { rev?: unknown } | null)?.rev;
      return typeof rev === 'string' && /^[a-z2-7]{13}$/.test(rev) ? rev : null;
    };

    return { status: 'ok', actor, pds: doc.pds, getRecord, listRecords, latestRev };
  } catch (e) {
    if (e instanceof Unavailable) return { status: 'unavailable', actor };
    console.error('resolvePublicRepo:', e);
    return { status: 'unavailable', actor };
  }
}

/**
 * Resolve an actor from a URL segment and read their palate record.
 *
 * Never throws: every failure is a status the page can render.
 */
export async function readPublicPalate(
  input: string,
  options: ReadOptions = {}
): Promise<PublicPalateResult> {
  const repo = await resolvePublicRepo(input, options);
  if (repo.status !== 'ok') return repo;

  try {
    const { value } = await repo.getRecord(PALATE_COLLECTION, PALATE_RKEY);
    if (!value) return { status: 'no-palate', actor: repo.actor };
    const palate = toPalate(value);
    if (!palate) return { status: 'no-palate', actor: repo.actor };
    if (!options.taste) return { status: 'ok', actor: repo.actor, palate };
    const taste = await readPublicTaste(repo, { aversions: palate.aversions, cache: options.tasteCache });
    return { status: 'ok', actor: repo.actor, palate, taste };
  } catch (e) {
    if (e instanceof Unavailable) return { status: 'unavailable', actor: repo.actor };
    console.error('readPublicPalate:', e);
    return { status: 'unavailable', actor: repo.actor };
  }
}

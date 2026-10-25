import { z } from 'zod';
import { isValidHandle, normalizeHandle } from '@bbthorson/atproto-cf-auth/server';
import { PALATE_COLLECTION, PALATE_RKEY, decodeCoordinates } from './records';

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
 * The fields of `app.crystalcoupe.palate` this page uses, and nothing else.
 * The coordinate is read by `decodeCoordinates`, which accepts the record's
 * current hundredths encoding and the floats written before it.
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
  dynamicState: z.object({ eventCount: z.number().int().min(0) }).partial().optional(),
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
}

export type PublicPalateResult =
  | { status: 'invalid' }
  | { status: 'not-found' }
  | { status: 'unavailable'; actor: PublicActor | null }
  | { status: 'no-palate'; actor: PublicActor }
  | { status: 'ok'; actor: PublicActor; palate: PublicPalate };

export interface ReadOptions {
  fetch?: typeof fetch;
  /** XRPC host for `resolveHandle`; the auth package honours the same variable. */
  handleResolver?: string;
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
  fetchImpl: typeof fetch
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
  if (text.length > MAX_BYTES) throw new Unavailable(`response too large: ${url.host}`);
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    throw new Unavailable(`not JSON: ${url.host}`);
  }
}

const DidDocSchema = z.object({
  id: z.string(),
  alsoKnownAs: z.array(z.string()).optional(),
  service: z
    .array(z.object({ id: z.string(), type: z.string(), serviceEndpoint: z.unknown() }))
    .optional(),
});

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

  const doc = DidDocSchema.safeParse(body);
  if (!doc.success || doc.data.id !== did) return null;

  const service = doc.data.service?.find(
    (s) =>
      (s.id === '#atproto_pds' || s.id === `${did}#atproto_pds`) &&
      s.type === 'AtprotoPersonalDataServer'
  );
  const pds = typeof service?.serviceEndpoint === 'string' ? safeUrl(service.serviceEndpoint) : null;
  if (!pds) return null;

  const aka = doc.data.alsoKnownAs?.find((a) => a.startsWith('at://'));
  const claimed = aka ? normalizeHandle(aka.slice('at://'.length), { defaultDomain: '' }) : null;
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

/**
 * Resolve an actor from a URL segment and read their palate record.
 *
 * Never throws: every failure is a status the page can render.
 */
export async function readPublicPalate(
  input: string,
  options: ReadOptions = {}
): Promise<PublicPalateResult> {
  const fetchImpl = options.fetch ?? fetch;
  const resolver =
    options.handleResolver ?? process.env.ATPROTO_HANDLE_RESOLVER ?? DEFAULT_HANDLE_RESOLVER;

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

    const recordUrl = new URL('/xrpc/com.atproto.repo.getRecord', doc.pds);
    recordUrl.searchParams.set('repo', did);
    recordUrl.searchParams.set('collection', PALATE_COLLECTION);
    recordUrl.searchParams.set('rkey', PALATE_RKEY);
    const { status, body } = await getJson(recordUrl, fetchImpl);
    // A missing record is a 400 RecordNotFound from most PDSes.
    if (status === 400 || status === 404) return { status: 'no-palate', actor };
    const palate = toPalate((body as { value?: unknown } | null)?.value);
    if (!palate) return { status: 'no-palate', actor };

    return { status: 'ok', actor, palate };
  } catch (e) {
    if (e instanceof Unavailable) return { status: 'unavailable', actor };
    console.error('readPublicPalate:', e);
    return { status: 'unavailable', actor };
  }
}

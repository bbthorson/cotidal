import { resolveHandleToDid, type ReadOptions } from './public-read';

/**
 * Level 1 venue verification: matching the bar's website URL to its AT Protocol
 * DID. A bar proves ownership of its domain either by using that domain as its
 * verified handle or by resolving that domain (via DNS `_atproto.<domain>` TXT
 * or `https://<domain>/.well-known/atproto-did`) to its DID.
 *
 * Level 2 (later, see docs/data-model.md, Venues) will verify physical presence by mailing
 * a postcard with a one-time code to the bar's address.
 */

export type VenueDomainVerification =
  | { ok: true; domain: string }
  | { ok: false; domain: string | null; reason: 'invalid-url' | 'mismatch' | 'unavailable' };

/** Extract a normalised bare domain (lowercase, without leading `www.`) from an http(s) URL. */
export function normalizeDomain(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
    if (!host || !host.includes('.')) return null;
    return host;
  } catch {
    return null;
  }
}

/**
 * True when the venue's website URL domain matches an already-verified handle
 * (e.g. `https://www.attaboy.nyc/menu` and `attaboy.nyc`).
 */
export function domainMatchesHandle(
  website: string | null | undefined,
  handle: string | null | undefined
): boolean {
  if (!website || !handle) return false;
  const domain = normalizeDomain(website);
  if (!domain) return false;
  const cleanHandle = handle.trim().toLowerCase().replace(/^@/, '').replace(/\.$/, '');
  return domain === cleanHandle;
}

/**
 * Verify that `website`'s domain resolves to `did` (either directly via the
 * signed-in account's verified `handle`, or via AT Protocol handle resolution).
 */
export async function verifyVenueDomain(
  website: string,
  did: string,
  handle: string | null,
  options: ReadOptions = {}
): Promise<VenueDomainVerification> {
  const domain = normalizeDomain(website);
  if (!domain) return { ok: false, domain: null, reason: 'invalid-url' };

  if (domainMatchesHandle(website, handle)) {
    return { ok: true, domain };
  }

  const resolved = await resolveHandleToDid(domain, options);
  if (resolved.status === 'unavailable') {
    return { ok: false, domain, reason: 'unavailable' };
  }
  if (resolved.did === did) {
    return { ok: true, domain };
  }
  return { ok: false, domain, reason: 'mismatch' };
}

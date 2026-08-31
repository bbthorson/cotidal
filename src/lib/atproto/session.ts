import { getAtprotoClient } from './client';

/**
 * Who is asking, and whether they can prove it.
 *
 * The `atproto_did` cookie is `HttpOnly`, which stops page scripts reading it
 * and stops nothing else: it is unsigned, and a DID is a public identifier, so
 * any client can send one. It names *whose session to restore*. It is not
 * itself authorisation.
 *
 * That distinction did not matter while every action failed at the PDS without
 * a real session. It matters for anything billed, which would otherwise run
 * first and charge regardless. See docs/generation.md.
 */

const DID_COOKIE = 'atproto_did';

/** The claimed DID. A claim — never treat it as proof. */
export function didFromRequest(request: Request): string | undefined {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(new RegExp(`(?:^|; )${DID_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * The DID of a caller whose OAuth session actually restores, or `null`.
 *
 * The restore is the authorisation. It is also the reason this is `async` and
 * worth doing before a model call rather than after.
 */
export async function restoredDid(request: Request): Promise<string | null> {
  const did = didFromRequest(request);
  if (!did) return null;

  const client = getAtprotoClient();
  if (!client) return null;

  try {
    await client.restore(did);
    return did;
  } catch {
    return null;
  }
}

import type { OAuthHelpers } from '@cloudflare/workers-oauth-provider';
import { MEMBER_SCOPES, grantUserId } from '../mcp/member-auth';

/**
 * The chat assistants a member has let act as them at `/mcp/me`, and taking
 * that back. Each is a grant in the OAuth provider's store, keyed by the
 * member (`grantUserId(did)`), so a member can only ever list or revoke their
 * own: the DID comes from their session, never from the form.
 *
 * Revoking deletes the grant and every token issued under it. The assistant's
 * next call gets a `401`, and if it asks again the member sees the consent
 * page again. It does not remove the connector from the assistant's own
 * settings; the page says so.
 */

export interface ConnectedAssistant {
  grantId: string;
  /** The client's name, as it gave it; `null` when it gave none. */
  name: string | null;
  /** A Client ID Metadata Document client's domain, which it controls. Absent for a self-registered one. */
  domain: string | null;
  /** Where its tokens went: the host the consent page showed. */
  redirectHost: string | null;
  canLog: boolean;
  connectedAt: Date;
}

/** At most this many grants are read; nobody connects a hundred assistants. */
const MAX_PAGES = 5;

function hostOf(uri: string | undefined): string | null {
  if (!uri) return null;
  try {
    return new URL(uri).host || uri;
  } catch {
    return null;
  }
}

function domainOf(clientId: string): string | null {
  // A CIMD client's id is the https URL of its metadata document.
  if (!clientId.startsWith('https://')) return null;
  return hostOf(clientId);
}

export async function listAssistants(oauth: OAuthHelpers, did: string): Promise<ConnectedAssistant[]> {
  const userId = grantUserId(did);
  const grants = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await oauth.listUserGrants(userId, { limit: 100, ...(cursor ? { cursor } : {}) });
    grants.push(...result.items);
    cursor = result.cursor;
    if (!cursor) break;
  }

  const assistants = await Promise.all(
    grants.map(async (grant): Promise<ConnectedAssistant> => {
      const client = await oauth.lookupClient(grant.clientId).catch(() => null);
      return {
        grantId: grant.id,
        name: client?.clientName?.trim() || null,
        domain: domainOf(grant.clientId),
        redirectHost: hostOf(grant.redirectUri ?? client?.redirectUris[0]),
        canLog: grant.scope.includes(MEMBER_SCOPES.write),
        // The provider keeps seconds.
        connectedAt: new Date(grant.createdAt * 1000),
      };
    })
  );
  return assistants.sort((a, b) => b.connectedAt.getTime() - a.connectedAt.getTime());
}

/**
 * Revoke one of the member's grants. A grant id that is not theirs revokes
 * nothing: grants are stored under the member, so another member's id is
 * simply not found there.
 */
export async function disconnectAssistant(oauth: OAuthHelpers, did: string, grantId: string): Promise<void> {
  if (!grantId) return;
  await oauth.revokeGrant(grantId, grantUserId(did));
}

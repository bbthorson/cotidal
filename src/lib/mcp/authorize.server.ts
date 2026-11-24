import {
  AuthorizationError,
  authorizationErrorRedirect,
  type AuthRequest,
  type ConsentDescription,
  type OAuthHelpers,
} from '@cloudflare/workers-oauth-provider';
import { AUTH_ERROR_MESSAGES, type AuthorizeResult } from '@bbthorson/atproto-cf-auth/server';
import { MEMBER_SCOPES, grantUserId } from './member-auth';

/**
 * Letting a chat assistant act for a member: `/oauth/authorize` and
 * `/oauth/callback` (docs/mcp.md § Signing a member in).
 *
 * 1. `showConsent` (GET): the provider checks the assistant's request, and the
 *    page says who is asking, where access goes and what it may do.
 * 2. `decide` (POST): Deny goes back to the assistant. Allow either finishes at
 *    once for a member already signed in here, or sends the person through the
 *    ordinary Bluesky sign-in with the approved request held server-side
 *    (`beginUpstream`).
 * 3. `finish` (the callback): the sign-in has just set this app's own session
 *    cookie, so the DID is read from that session, which the sign-in library
 *    proved, and the grant is completed for it.
 *
 * Nothing about who the person is comes from the form or the URL. The consent
 * handle and the upstream `state` are each bound to this browser by cookie
 * and work once, so neither can be replayed from somewhere else.
 *
 * Both collaborators are passed in, so the flow is tested with the real
 * provider over memory KV and a stand-in for the sign-in.
 */

export const OAUTH_CALLBACK_PATH = '/oauth/callback';

/** The parts of `@bbthorson/atproto-cf-auth` the flow uses. */
export interface MemberSignIn {
  /** The member signed in here, from the session cookie; no token refresh. */
  getUser(request: Request): Promise<{ did: string; handle?: string; signedInAt: string } | null>;
  /** The member signed in here whose AT-Proto session still restores, or `null`. */
  restoredDid(request: Request): Promise<string | null>;
  authorize(request: Request, input: { handle: string; returnTo: string }): Promise<AuthorizeResult>;
}

export interface ConsentPage {
  kind: 'consent';
  details: ConsentDescription;
  /** The browser-bound consent handle, posted back as `consent`. */
  consent: string;
  member: { did: string; handle: string | null } | null;
  error: string | null;
  /** The handle they typed, kept when the page is shown again with an error. */
  handle: string;
  /** Bind the consent handle to the browser and forbid framing: send them with the page. */
  headers: Headers;
}

/** A request that cannot be answered by redirecting to the assistant: shown here instead. */
export interface RefusedPage {
  kind: 'refused';
  message: string;
}

export type AuthorizeView = ConsentPage | RefusedPage;

/**
 * What Allow grants: always the baseline, and logging pours when the member
 * ticked it. The member chooses on the page, whatever the assistant asked
 * for: an assistant that asks only for the baseline (as the `401` tells it
 * to) can still be let log pours without a second round trip, and a member
 * who unticks it is asked again, by step-up, the first time one is logged.
 */
export function grantedScopes(form: FormData): string[] {
  return form.getAll('scope').includes(MEMBER_SCOPES.write)
    ? [MEMBER_SCOPES.read, MEMBER_SCOPES.write]
    : [MEMBER_SCOPES.read];
}

function redirect(location: string, headers = new Headers()): Response {
  headers.set('Location', location);
  headers.set('Cache-Control', 'no-store');
  return new Response(null, { status: 302, headers });
}

/** An `AuthorizationError` the assistant should hear about, or the page to show instead. */
function refused(error: unknown): Response | RefusedPage {
  if (error instanceof AuthorizationError) {
    if (error.redirectTo) return redirect(error.redirectTo);
    return { kind: 'refused', message: error.description };
  }
  throw error;
}

async function consentFor(
  request: Request,
  authRequest: AuthRequest,
  oauth: OAuthHelpers,
  signIn: MemberSignIn,
  error: string | null = null,
  typed = ''
): Promise<ConsentPage> {
  // Describe first: a client whose metadata cannot be read leaves nothing in KV.
  const details = await oauth.describeConsent(authRequest);
  const { handle, headers } = await oauth.beginConsent(authRequest);
  const user = await signIn.getUser(request).catch(() => null);
  return {
    kind: 'consent',
    details,
    consent: handle,
    member: user ? { did: user.did, handle: user.handle ?? null } : null,
    error,
    handle: typed,
    headers,
  };
}

/** GET `/oauth/authorize`. */
export async function showConsent(
  request: Request,
  oauth: OAuthHelpers,
  signIn: MemberSignIn
): Promise<Response | AuthorizeView> {
  try {
    return await consentFor(request, await oauth.parseAuthRequest(request), oauth, signIn);
  } catch (e) {
    return refused(e);
  }
}

/**
 * Finish the grant for a DID: the token the assistant gets carries it as
 * `props.did`, and nothing else identifies the member to `/mcp/me`.
 */
async function complete(
  oauth: OAuthHelpers,
  authRequest: AuthRequest,
  did: string,
  handle: string | null,
  headers?: Headers
): Promise<Response> {
  const { redirectTo } = await oauth.completeAuthorization({
    request: authRequest,
    userId: grantUserId(did),
    metadata: { handle },
    scope: authRequest.scope,
    props: { did },
  });
  return redirect(redirectTo, headers);
}

/** POST `/oauth/authorize`: the consent form. */
export async function decide(
  request: Request,
  oauth: OAuthHelpers,
  signIn: MemberSignIn
): Promise<Response | AuthorizeView> {
  const form = await request.formData();
  const consent = String(form.get('consent') ?? '');

  try {
    if (form.get('decision') !== 'allow') {
      const denied = await oauth.denyConsent(request, consent);
      return new Response(null, { status: 302, headers: denied.headers });
    }

    // The client, redirect and resource come from the stored request, never
    // the form; the form says only what the member ticked.
    const pending = await oauth.approveConsent(request, consent, { scope: grantedScopes(form) });
    const authRequest = pending.request;

    // Already signed in here, and chose to continue as that member.
    if (form.get('as') === 'member') {
      const user = await signIn.getUser(request).catch(() => null);
      const did = await signIn.restoredDid(request);
      if (did && user?.did === did) return complete(oauth, authRequest, did, user.handle ?? null, pending.headers);
      return consentFor(request, authRequest, oauth, signIn, AUTH_ERROR_MESSAGES.callback_failed);
    }

    const handle = String(form.get('handle') ?? '').trim();
    const upstream = await oauth.beginUpstream(authRequest, {
      data: { startedAt: Date.now() } satisfies UpstreamData,
      headers: pending.headers,
    });
    const started = await signIn.authorize(request, {
      handle,
      returnTo: `${OAUTH_CALLBACK_PATH}?state=${encodeURIComponent(upstream.state)}`,
    });
    if (!started.ok) {
      // The handle was refused before anyone left: ask again, with a fresh consent.
      return consentFor(request, authRequest, oauth, signIn, AUTH_ERROR_MESSAGES[started.error], handle);
    }
    for (const cookie of started.cookies) upstream.headers.append('Set-Cookie', cookie);
    return redirect(started.url, upstream.headers);
  } catch (e) {
    return refused(e);
  }
}

interface UpstreamData {
  /** When the Bluesky sign-in was sent off: the session at the callback must be newer. */
  startedAt: number;
}

/** GET `/oauth/callback`: back from the Bluesky sign-in. */
export async function finish(
  request: Request,
  oauth: OAuthHelpers,
  signIn: MemberSignIn
): Promise<Response | RefusedPage> {
  let resumed;
  try {
    resumed = await oauth.finishUpstream<UpstreamData>(request);
  } catch (e) {
    return refused(e) as Response | RefusedPage;
  }
  const { request: authRequest, data, headers } = resumed;
  const deny = () => redirect(authorizationErrorRedirect(authRequest, 'access_denied'), headers);

  // The sign-in failed or was cancelled: it came back with `auth_error`.
  if (new URL(request.url).searchParams.has('auth_error')) return deny();

  // The session must be the one this sign-in just made, not an older one the
  // browser happened to hold.
  const user = await signIn.getUser(request).catch(() => null);
  if (!user || Date.parse(user.signedInAt) < data.startedAt) return deny();

  return complete(oauth, authRequest, user.did, user.handle ?? null, headers);
}

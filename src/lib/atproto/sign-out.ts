import { signedOutPath } from './paths';

/**
 * The header's Sign out is a form post to the auth package's `logout`, which
 * answers 303 to /taste. Pure, so it can be tested without a session.
 */
export function isFormSignOut(request: Request, response: Response): boolean {
  return (
    request.method === 'POST' &&
    new URL(request.url).pathname.endsWith('/logout') &&
    response.status === 303
  );
}

/**
 * A form sign-out lands on /taste marked as signed out, so the island there
 * clears this device's copy of the coordinate: signing out should leave
 * nothing of yours behind on a shared device. The cleared session cookie the
 * package set is kept.
 */
export function toSignedOut(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('location', signedOutPath);
  return new Response(null, { status: 303, headers });
}

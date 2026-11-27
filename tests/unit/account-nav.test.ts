import { test, expect } from 'vitest';
import { isFormSignOut, toSignedOut } from '../../src/lib/atproto/sign-out';
import { signedOutPath } from '../../src/lib/atproto/paths';
import { derivePalateRecord } from '../../src/lib/palate/sensory';
import type { Palate } from '../../src/lib/atproto/records';

/**
 * Who is signed in, how to stop being, and how to start over. The suite runs
 * with sign-in off, so the member half of the header is held by the pieces
 * it is built from; the guest and prerendered halves are rendered for real.
 */

const profile = { x: 4, y: -2, vibeTags: {}, dislikesSmoke: false, dislikesBitter: false, dislikesAnise: false };

test('Sign out: the form post lands on Compass marked, with the cleared cookie kept', () => {
  const request = new Request('https://cotidal.app/api/auth/atproto/logout', { method: 'POST' });
  const packaged = new Response(null, {
    status: 303,
    headers: { location: '/compass', 'set-cookie': 'bsky_sid=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure' },
  });
  expect(isFormSignOut(request, packaged)).toBe(true);
  const out = toSignedOut(packaged);
  expect(out.status).toBe(303);
  expect(out.headers.get('location')).toBe(signedOutPath);
  expect(out.headers.get('set-cookie')).toContain('bsky_sid=;');

  // The island's JSON calls and the other routes pass through untouched.
  expect(isFormSignOut(new Request('https://cotidal.app/api/auth/atproto/session'), packaged)).toBe(false);
  expect(isFormSignOut(request, new Response(null, { status: 204 }))).toBe(false);
});

test('Start over: a retake restarts the filter instead of keeping the old one', () => {
  const existing: Palate = {
    $type: 'app.cotidal.palate',
    mapCoordinates: { x: -6, y: 5 },
    dynamicState: { latentVector: [-6, 5, 7, 6, 8], covarianceDiagonal: [1, 1, 2, 2, 2], eventCount: 14 },
    aversions: { smoke: false, bitter: false, anise: false },
    vibeTags: {},
    createdAt: '2026-09-01T00:00:00.000Z',
  };
  const record = derivePalateRecord(profile, existing);
  // The old state pulled the next pour back toward (-6, 5).
  expect(record.dynamicState.latentVector.slice(0, 2)).toEqual([4, -2]);
  expect(record.dynamicState.eventCount).toBe(0);
  expect(record.createdAt).toBe(existing.createdAt);
});


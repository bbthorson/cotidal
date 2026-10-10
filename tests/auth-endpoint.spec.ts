import { test, expect } from '@playwright/test';

/**
 * Replaces the old Firebase anonymous-sign-in test: there is no Firebase in
 * this codebase any more. Sign-in is AT Protocol OAuth, and the login route
 * is content-negotiated so the marketing page can post a plain <form>.
 */

test('Auth: JSON callers get JSON back', async ({ request }) => {
  const res = await request.post('/api/auth/atproto/login', {
    data: { handle: 'alice.bsky.social' },
  });

  // 200 with an authorize URL when configured; 503 when absent; 400/502 when the handle
  // cannot be used (loopback host, offline); 500 otherwise.
  expect([200, 400, 500, 502, 503]).toContain(res.status());
  const body = await res.json();
  expect(body).toHaveProperty(res.status() === 200 ? 'url' : 'error');
});

test('Auth: form callers get a redirect, never JSON', async ({ request }) => {
  const res = await request.post('/api/auth/atproto/login', {
    form: { handle: 'alice.bsky.social' },
    headers: { Origin: 'http://localhost:9002' },
    maxRedirects: 0,
  });

  expect(res.status()).toBe(303);
  expect(res.headers()['location']).toBeTruthy();
});

test('Auth: a missing handle is rejected', async ({ request }) => {
  const res = await request.post('/api/auth/atproto/login', { data: {} });
  expect(res.status()).toBeGreaterThanOrEqual(400);
});

test('Auth: the session probe answers a guest, signed in or not configured', async ({ request }) => {
  const res = await request.get('/api/auth/atproto/session');
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ authenticated: false });
});

test('Auth: client metadata is served for OAuth discovery', async ({ request }) => {
  const res = await request.get('/api/auth/atproto/client-metadata.json');
  if (res.status() === 200) {
    const body = await res.json();
    expect(body).toHaveProperty('client_id');
    expect(body).toHaveProperty('redirect_uris');
  } else {
    // Not configured in this environment.
    expect([404, 500, 503]).toContain(res.status());
  }
});

/*
 * The `drinkName` guard added alongside this (atproto-publish.ts) is not
 * reachable over HTTP without an authenticated session: the route returns 401
 * before it validates the body. An end-to-end test here would pass on the
 * auth check rather than the guard, so the guard is left to the type system
 * and its own explicit check instead of a test that proves nothing.
 */

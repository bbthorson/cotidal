import { test, expect, type APIRequestContext } from '@playwright/test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { connect } from '../src/lib/copy';

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

/**
 * Whether the server will run a sign-in, asked without touching the network:
 * a handle that cannot be valid is refused with 400 before any lookup when
 * sign-in is on, and the route answers 503 `not_configured` when it is off.
 */
async function serverSignInEnabled(request: APIRequestContext): Promise<boolean> {
  const res = await request.post('/api/auth/atproto/login', { data: { handle: 'x' } });
  return res.status() !== 503;
}

/*
 * The page and the server used to read the on/off switch from two places —
 * a build-time variable inlined into `/` and the island, and a runtime one on
 * the Worker — so setting it in only one left a form that posted to a route
 * that refused it, or no form at all in front of a route that worked.
 * Whatever this environment is configured as, the three must agree.
 */
test('Auth: the landing form is offered exactly when the server will sign in', async ({ request }) => {
  const enabled = await serverSignInEnabled(request);
  const html = await (await request.get('/')).text();
  expect(html.includes('action="/api/auth/atproto/login"')).toBe(enabled);
  expect(html.includes(connect.disabled)).toBe(!enabled);
});

test('Auth: the sign-in sheet on every app page agrees with the server', async ({ page, request }) => {
  const enabled = await serverSignInEnabled(request);
  for (const path of ['/compass', '/radio', '/log', '/harbour', '/rate', '/questions']) {
    await page.goto(`${path}?signin=1`);
    const dialog = page.getByRole('dialog');
    await expect(dialog, path).toBeVisible();
    if (enabled) {
      await expect(dialog.getByPlaceholder(connect.placeholder), path).toBeVisible();
    } else {
      await expect(dialog.getByText(connect.disabled), path).toBeVisible();
    }
  }
});

test('Auth: no browser code decides for itself whether sign-in is on', () => {
  // Anything the browser reads was fixed when the site was built.
  const dir = join(process.cwd(), 'dist', 'client', '_astro');
  test.skip(!existsSync(dir), 'needs a build (npm run build)');
  const offenders = readdirSync(dir)
    .filter((f) => f.endsWith('.js'))
    .filter((f) => readFileSync(join(dir, f), 'utf8').includes('ATPROTO_ENABLED'));
  expect(offenders).toEqual([]);
});

/*
 * The `drinkName` guard added alongside this (atproto-publish.ts) is not
 * reachable over HTTP without an authenticated session: the route returns 401
 * before it validates the body. An end-to-end test here would pass on the
 * auth check rather than the guard, so the guard is left to the type system
 * and its own explicit check instead of a test that proves nothing.
 */

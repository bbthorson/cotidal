import { test, expect, type APIRequestContext } from '@playwright/test';
import { assistants } from '../src/lib/copy';

/**
 * `/mcp` over the wire: a Streamable HTTP MCP server, stateless and
 * read-only. Only paths that resolve offline are called — a reserved TLD is
 * refused before any network lookup, and drink search never leaves the Worker.
 */

const HEADERS = {
  'content-type': 'application/json',
  accept: 'application/json, text/event-stream',
};

async function rpc(request: APIRequestContext, method: string, params: unknown = {}) {
  const res = await request.post('/mcp', {
    headers: HEADERS,
    data: { jsonrpc: '2.0', id: 1, method, params },
  });
  expect(res.status()).toBe(200);
  return (await res.json()) as { result?: Record<string, any>; error?: unknown };
}

test('MCP endpoint: initializes without a session', async ({ request }) => {
  const body = await rpc(request, 'initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'test', version: '0' },
  });
  expect(body.result?.serverInfo.name).toBe('cotidal');
  expect(body.result?.capabilities.tools).toBeTruthy();
});

test('MCP endpoint: lists the read-only tools', async ({ request }) => {
  const body = await rpc(request, 'tools/list');
  const tools = body.result?.tools as { name: string; annotations?: { readOnlyHint?: boolean } }[];
  expect(tools.map((t) => t.name).sort()).toEqual(
    ['compare_palates', 'get_palate', 'rank_menu', 'recommend_drinks', 'search_drinks'].sort()
  );
  for (const tool of tools) expect(tool.annotations?.readOnlyHint).toBe(true);
});

test('MCP endpoint: searches drinks', async ({ request }) => {
  const body = await rpc(request, 'tools/call', { name: 'search_drinks', arguments: { query: 'negroni' } });
  expect(body.result?.isError).toBeFalsy();
  expect(body.result?.structuredContent.drinks[0].name).toBe('Negroni');
});

test('MCP endpoint: an unreadable handle is a tool error, not a failed request', async ({ request }) => {
  const body = await rpc(request, 'tools/call', {
    name: 'get_palate',
    arguments: { handle: 'nobody.invalid' },
  });
  expect(body.result?.isError).toBe(true);
  expect(body.result?.content[0].text).toContain('nobody.invalid');
});

test('MCP endpoint: a browser opening the address is shown how to use it, at the same URL', async ({ page }) => {
  const scripts: string[] = [];
  page.on('response', (res) => {
    if (res.request().resourceType() !== 'script') return;
    const url = res.url();
    if (/\/@vite\/|\/@id\/|\/dev-toolbar\/|\/node_modules\//.test(url) || url.endsWith('.css')) return;
    scripts.push(url);
  });
  const res = await page.goto('/mcp', { waitUntil: 'networkidle' });
  expect(res?.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe('/mcp');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(assistants.title);
  await expect(page.getByTestId('mcp-address')).toHaveText(new URL('/mcp', page.url()).toString());
  expect(scripts, `unexpected scripts: ${scripts.join(', ')}`).toHaveLength(0);
  expect(await page.locator('astro-island').count()).toBe(0);
});

test('MCP endpoint: a client asking for an event stream is never sent the page', async ({ request }) => {
  const res = await request.get('/mcp', { headers: { accept: 'text/event-stream' } });
  expect(res.headers()['content-type'] ?? '').not.toContain('text/html');
  const post = await request.post('/mcp', {
    headers: { ...HEADERS, accept: 'text/html, application/json, text/event-stream' },
    data: { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} },
  });
  expect(post.status()).toBe(200);
  expect((await post.json()).result.tools.length).toBe(5);
});

test('Assistants page: the address, the steps and what it cannot do', async ({ request }) => {
  const res = await request.get('/assistants');
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).toContain('/mcp');
  expect(html).toContain(assistants.steps[1]);
  expect(html).toContain(assistants.readOnlyTitle);
});

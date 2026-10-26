import { test, expect, type APIRequestContext } from '@playwright/test';

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

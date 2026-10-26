import type { APIRoute } from 'astro';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer } from '@/lib/mcp/server';
import { readPublicPalate } from '@/lib/atproto/public-read';
import { loadRegister } from '@/lib/register.server';

/**
 * The palate map as an MCP server, for chat assistants: add
 * `https://<host>/mcp` as a custom connector. Streamable HTTP, stateless and
 * read-only — every tool reads public records the way `/p/<handle>` does, so
 * it needs no sign-in. Writing (logging a pour) waits on the assistant being
 * able to sign in as the member; see docs/mcp.md.
 */

export const prerender = false;

const handle: APIRoute = async ({ request }) => {
  const server = createMcpServer({
    readPalate: (actor) => readPublicPalate(actor),
    register: await loadRegister(),
    origin: new URL(request.url).origin,
  });
  // No session id: each request stands alone, and plain JSON answers rather
  // than an event stream, since no tool streams or notifies.
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    await server.close();
  }
};

export const POST = handle;
export const GET = handle;
export const DELETE = handle;

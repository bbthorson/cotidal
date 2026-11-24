import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer } from './server';
import type { ToolContext } from './tools';

/**
 * Answer one MCP request. Stateless: no session id, a new server per request,
 * and plain JSON answers rather than an event stream, since no tool streams or
 * notifies. `/mcp` and `/mcp/me` both answer through here.
 */
export async function serveMcp(request: Request, ctx: ToolContext): Promise<Response> {
  const server = createMcpServer(ctx);
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
}
